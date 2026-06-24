import { DiffEditor } from '@monaco-editor/react';
import '../lib/monaco-setup';

export interface DiffViewProps {
  original: string;
  modified: string;
  language?: string;
  /** Side-by-side when true, inline when false. */
  sideBySide?: boolean;
}

/**
 * A real Monaco diff editor: side-by-side or inline, with the built-in change
 * navigation (F7 and Shift+F7) and collapsed unchanged regions. Read-only; it is
 * for reviewing a change, not editing it. The local monaco-setup import keeps it
 * offline, like the main editor.
 */
export function DiffView({ original, modified, language, sideBySide = true }: DiffViewProps) {
  return (
    <DiffEditor
      height="100%"
      theme="vs-dark"
      language={language}
      original={original}
      modified={modified}
      loading={<div className="editor-loading">Loading diff...</div>}
      options={{
        readOnly: true,
        renderSideBySide: sideBySide,
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Cascadia Code', ui-monospace, monospace",
        scrollBeyondLastLine: false,
        hideUnchangedRegions: { enabled: true },
      }}
    />
  );
}
