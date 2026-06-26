import { useRef, useEffect, useSyncExternalStore } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { setMarkdownLinkPaths } from '../lib/monaco-setup';
import {
  setActiveEditor,
  clearActiveEditor,
  setEditorStatus,
  registerLanguageSetter,
  registerEolSetter,
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
import { findConflicts } from '../lib/conflicts';
import { findBrokenLinks } from '../lib/markdown-links';
import { isUntitled } from '../lib/untitled';
import { resolveDefaultEol, isWindowsPlatform } from '../lib/eol';

interface EditorPanelProps {
  path?: string;
  value: string;
  language?: string;
  /** One-based line to reveal once this file is shown (for cross-file symbol jumps). */
  revealLine?: number;
  /** Called after a revealLine has been applied, so the caller can clear it (one-shot). */
  onRevealed?: () => void;
  onChange?: (value: string) => void;
  onSave?: (value: string) => void;
  /** When true, the editor is read-only (Monaco rejects edits). */
  readOnly?: boolean;
  /** Workspace file paths used to validate Markdown links (broken-link diagnostics). */
  linkablePaths?: readonly string[];
}

/**
 * The Monaco code editor: the protagonist of the IDE. Real editing, multi-cursor,
 * IntelliSense, and a minimap. Ctrl or Cmd plus S saves. In the native app the
 * value is read from and written to disk through the Rust core; in the browser it
 * edits in memory.
 */
export function EditorPanel({
  path,
  value,
  language,
  revealLine,
  onRevealed,
  onChange,
  onSave,
  readOnly,
  linkablePaths,
}: EditorPanelProps) {
  const editorRef = useRef<BridgeEditor | null>(null);
  const monacoEditorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoApiRef = useRef<Parameters<OnMount>[1] | null>(null);
  // Decoration ids tracked PER MODEL: @monaco-editor/react keeps one editor and swaps
  // cached models on a path change, and deltaDecorations only clears ids on the current
  // model, so a single shared id list would leak/duplicate across file switches.
  const conflictDecorationsByModelRef = useRef<WeakMap<object, string[]>>(new WeakMap());
  const settings = useSyncExternalStore(subscribeEditorSettings, getEditorSettings, getEditorSettings);
  const monacoTheme = useMonacoTheme();

  const onMount: OnMount = (editor, monacoInstance) => {
    monacoEditorRef.current = editor;
    monacoApiRef.current = monacoInstance;
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
      void (async () => {
        const current = getEditorSettings();
        // Format on save first, so trim/final-newline run on the formatted text.
        if (current.formatOnSave) {
          try {
            await editor.getAction('editor.action.formatDocument')?.run();
          } catch {
            // A language without a formatter is fine; just save as-is.
          }
        }
        const next = applyOnSave(editor.getValue(), {
          trimTrailingWhitespace: current.trimTrailingWhitespace,
          insertFinalNewline: current.insertFinalNewline,
          trimFinalNewlines: current.trimFinalNewlines,
        });
        if (next !== editor.getValue()) {
          const position = editor.getPosition();
          editor.setValue(next);
          if (position) editor.setPosition(position);
        }
        onSave?.(next);
      })();
    });
    // Publish this editor as the active one so palette actions (go to line, and
    // the editor command surface) can reach the file the user is looking at.
    const bridge = editor as unknown as BridgeEditor;
    editorRef.current = bridge;
    setActiveEditor(bridge);
    // Let the status-bar Change Language Mode picker switch this editor's language
    // live (the setter needs the Monaco namespace, which only the panel has).
    registerLanguageSetter((languageId) => {
      const model = editor.getModel();
      if (model) monacoInstance.editor.setModelLanguage(model, languageId);
    });
    // Let the status-bar End of Line picker convert this editor's line endings live.
    registerEolSetter((eol) => {
      const model = editor.getModel();
      if (model) {
        model.pushEOL(
          eol === 'CRLF'
            ? monacoInstance.editor.EndOfLineSequence.CRLF
            : monacoInstance.editor.EndOfLineSequence.LF,
        );
      }
    });

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
    editor.onDidChangeModelLanguage(publishStatus);
    publishStatus();
  };

  // Stop claiming the active editor and clear the status once this panel unmounts.
  useEffect(
    () => () => {
      if (editorRef.current) clearActiveEditor(editorRef.current);
      setEditorStatus(null);
      registerLanguageSetter(null);
      registerEolSetter(null);
    },
    [],
  );

  // Reveal a requested line once this file is shown. The child Editor swaps the
  // model on a path change before this (parent) effect runs, so a cross-file symbol
  // jump lands in the right document rather than racing the model swap.
  useEffect(() => {
    if (revealLine == null) return;
    const editor = editorRef.current;
    if (!editor) return;
    editor.revealLineInCenter(revealLine);
    editor.setPosition({ lineNumber: revealLine, column: 1 });
    editor.focus();
    // One-shot: clear the target so a later normal re-open of this file does not
    // re-jump to the stale symbol line or steal focus.
    onRevealed?.();
  }, [revealLine, path, onRevealed]);

  // Highlight git merge-conflict regions inline: the markers, the current side, and
  // the incoming side. Recomputed as the content changes; cleared when none remain.
  useEffect(() => {
    const editor = monacoEditorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return;
    const decorations = findConflicts(value).flatMap((conflict) => {
      const lineDecoration = (lineNumber: number, className: string) => ({
        range: { startLineNumber: lineNumber, startColumn: 1, endLineNumber: lineNumber, endColumn: 1 },
        options: { isWholeLine: true, className },
      });
      const out = [
        lineDecoration(conflict.start, 'conflict-marker'),
        lineDecoration(conflict.separator, 'conflict-marker'),
        lineDecoration(conflict.end, 'conflict-marker'),
      ];
      for (let line = conflict.start + 1; line < conflict.separator; line += 1) {
        out.push(lineDecoration(line, 'conflict-current'));
      }
      for (let line = conflict.separator + 1; line < conflict.end; line += 1) {
        out.push(lineDecoration(line, 'conflict-incoming'));
      }
      return out;
    });
    // Clear and reapply this model's own previous decorations, so revisiting a file
    // (its cached model) replaces rather than accumulates the highlighting.
    const previous = conflictDecorationsByModelRef.current.get(model) ?? [];
    conflictDecorationsByModelRef.current.set(model, editor.deltaDecorations(previous, decorations));
  }, [value, path]);

  // Flag Markdown links whose target is not a known workspace file, as Problems-panel
  // warnings (Monaco markers under our own owner). Cleared for non-Markdown files.
  useEffect(() => {
    const editor = monacoEditorRef.current;
    const model = editor?.getModel();
    const monaco = monacoApiRef.current;
    if (!editor || !model || !monaco) return;
    const owner = 'markdown-links';
    // Only validate when the file set is actually provided; treating "not provided" as an
    // empty set would flag every valid link. Cleared for non-Markdown files.
    if (path && path.toLowerCase().endsWith('.md') && linkablePaths) {
      const markers = findBrokenLinks(value, path, linkablePaths).map((link) => ({
        severity: monaco.MarkerSeverity.Warning,
        message: `Link target not found: ${link.target}`,
        startLineNumber: link.line,
        startColumn: link.column,
        endLineNumber: link.line,
        endColumn: link.endColumn,
      }));
      monaco.editor.setModelMarkers(model, owner, markers);
    } else {
      monaco.editor.setModelMarkers(model, owner, []);
    }
  }, [value, path, linkablePaths]);

  // Feed the workspace file list to the Markdown link-path completion provider (global,
  // registered in monaco-setup), so typing [text](... suggests real files.
  useEffect(() => {
    setMarkdownLinkPaths(linkablePaths ?? []);
  }, [linkablePaths]);

  // A new untitled file takes the configured default line ending, applied once per path
  // (the first time it is seen empty) so clearing the buffer later does not override a
  // manual End of Line choice. Existing files keep their detected EOL (handled on load).
  const eolAppliedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!path || !isUntitled(path) || value !== '' || eolAppliedRef.current.has(path)) return;
    const model = monacoEditorRef.current?.getModel();
    const monaco = monacoApiRef.current;
    if (!model || !monaco) return;
    eolAppliedRef.current.add(path);
    const eol = resolveDefaultEol(settings.defaultEol, isWindowsPlatform());
    model.pushEOL(
      eol === 'CRLF' ? monaco.editor.EndOfLineSequence.CRLF : monaco.editor.EndOfLineSequence.LF,
    );
  }, [path, value, settings.defaultEol]);

  return (
    <div className="editor-panel" data-readonly={readOnly ? 'true' : undefined}>
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
          find: { seedSearchStringFromSelection: 'always', autoFindInSelection: 'multiline' },
          // scrollBeyondLastLine, smoothScrolling, and cursorBlinking now come from
          // editorSettingsToMonaco below (spread last, so it is the source of truth).
          ...editorSettingsToMonaco(settings),
          // After the settings spread so a future settings-sourced readOnly cannot override the toggle.
          readOnly: readOnly ?? false,
        }}
      />
    </div>
  );
}
