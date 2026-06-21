import Editor, { type OnMount } from '@monaco-editor/react';
import '../lib/monaco-setup';

interface EditorPanelProps {
  path?: string;
  value: string;
  language?: string;
  onChange?: (value: string) => void;
  onSave?: (value: string) => void;
}

const LANG_BY_EXT: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  json: 'json',
  css: 'css',
  html: 'html',
  md: 'markdown',
  rs: 'rust',
};

function languageFor(path?: string, explicit?: string): string {
  if (explicit) return explicit;
  const ext = path?.split('.').pop() ?? '';
  return LANG_BY_EXT[ext] ?? 'plaintext';
}

/**
 * The Monaco code editor: the protagonist of the IDE. Real editing, multi-cursor,
 * IntelliSense, and a minimap. Ctrl or Cmd plus S saves. In the native app the
 * value is read from and written to disk through the Rust core; in the browser it
 * edits in memory.
 */
export function EditorPanel({ path, value, language, onChange, onSave }: EditorPanelProps) {
  const onMount: OnMount = (editor, monacoInstance) => {
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
      onSave?.(editor.getValue());
    });
  };

  return (
    <div className="editor-panel">
      <Editor
        height="100%"
        theme="vs-dark"
        path={path}
        language={languageFor(path, language)}
        value={value}
        onChange={(next) => onChange?.(next ?? '')}
        onMount={onMount}
        loading={<div className="editor-loading">Loading editor...</div>}
        options={{
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Cascadia Code', ui-monospace, monospace",
          fontLigatures: true,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          renderWhitespace: 'selection',
          smoothScrolling: true,
          cursorBlinking: 'smooth',
        }}
      />
    </div>
  );
}
