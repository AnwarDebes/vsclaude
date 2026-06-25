import { useRef, useEffect, useSyncExternalStore } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import '../lib/monaco-setup';
import {
  setActiveEditor,
  clearActiveEditor,
  setEditorStatus,
  type BridgeEditor,
} from '../lib/editor-bridge';
import {
  editorSettingsToMonaco,
  getEditorSettings,
  subscribeEditorSettings,
} from '../lib/editor-settings';
import { useMonacoTheme } from '../lib/monaco-theme';
import { languageForPath } from '../lib/language';
import { applyOnSave } from '../lib/on-save';

interface EditorPanelProps {
  path?: string;
  value: string;
  language?: string;
  onChange?: (value: string) => void;
  onSave?: (value: string) => void;
}

/**
 * The Monaco code editor: the protagonist of the IDE. Real editing, multi-cursor,
 * IntelliSense, and a minimap. Ctrl or Cmd plus S saves. In the native app the
 * value is read from and written to disk through the Rust core; in the browser it
 * edits in memory.
 */
export function EditorPanel({ path, value, language, onChange, onSave }: EditorPanelProps) {
  const editorRef = useRef<BridgeEditor | null>(null);
  const settings = useSyncExternalStore(subscribeEditorSettings, getEditorSettings, getEditorSettings);
  const monacoTheme = useMonacoTheme();

  const onMount: OnMount = (editor, monacoInstance) => {
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
      const current = getEditorSettings();
      const next = applyOnSave(editor.getValue(), {
        trimTrailingWhitespace: current.trimTrailingWhitespace,
        insertFinalNewline: current.insertFinalNewline,
      });
      if (next !== editor.getValue()) {
        const position = editor.getPosition();
        editor.setValue(next);
        if (position) editor.setPosition(position);
      }
      onSave?.(next);
    });
    // Publish this editor as the active one so palette actions (go to line, and
    // the editor command surface) can reach the file the user is looking at.
    const bridge = editor as unknown as BridgeEditor;
    editorRef.current = bridge;
    setActiveEditor(bridge);

    // Publish a status snapshot for the status bar and keep it live.
    const publishStatus = () => {
      const model = editor.getModel();
      const pos = editor.getPosition();
      const selection = editor.getSelection();
      const selectionCount = model && selection ? model.getValueInRange(selection).length : 0;
      const options = model?.getOptions();
      setEditorStatus({
        line: pos?.lineNumber ?? 1,
        column: pos?.column ?? 1,
        selectionCount,
        language: model?.getLanguageId() ?? 'plaintext',
        eol: model?.getEOL() === '\r\n' ? 'CRLF' : 'LF',
        indent: {
          insertSpaces: options?.insertSpaces ?? true,
          tabSize: options?.tabSize ?? 2,
        },
      });
    };
    editor.onDidFocusEditorText(() => {
      setActiveEditor(bridge);
      publishStatus();
    });
    editor.onDidChangeCursorPosition(publishStatus);
    editor.onDidChangeCursorSelection(publishStatus);
    editor.onDidChangeModelContent(publishStatus);
    editor.onDidChangeModel(publishStatus);
    publishStatus();
  };

  // Stop claiming the active editor and clear the status once this panel unmounts.
  useEffect(
    () => () => {
      if (editorRef.current) clearActiveEditor(editorRef.current);
      setEditorStatus(null);
    },
    [],
  );

  return (
    <div className="editor-panel">
      <Editor
        height="100%"
        theme={monacoTheme}
        path={path}
        language={languageForPath(path, language)}
        value={value}
        onChange={(next) => onChange?.(next ?? '')}
        onMount={onMount}
        loading={<div className="editor-loading">Loading editor...</div>}
        options={{
          automaticLayout: true,
          largeFileOptimizations: true,
          maxTokenizationLineLength: 20000,
          inlayHints: { enabled: 'on' },
          find: { seedSearchStringFromSelection: 'always', autoFindInSelection: 'multiline' },
          // scrollBeyondLastLine, smoothScrolling, and cursorBlinking now come from
          // editorSettingsToMonaco below (spread last, so it is the source of truth).
          ...editorSettingsToMonaco(settings),
        }}
      />
    </div>
  );
}
