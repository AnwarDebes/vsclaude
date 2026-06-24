import { useSyncExternalStore } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import '../lib/monaco-setup';
import { useMonacoTheme } from '../lib/monaco-theme';
import { getEditorSettings, subscribeEditorSettings } from '../lib/editor-settings';

/** A loose view of the Monaco diff editor: the methods the change counter uses. */
interface DiffEditorHandle {
  getLineChanges(): unknown[] | null;
  onDidUpdateDiff(listener: () => void): void;
}

export interface DiffViewProps {
  original: string;
  modified: string;
  language?: string;
  /** Side-by-side when true, inline when false. */
  sideBySide?: boolean;
  /** Report the number of changed regions as the diff is (re)computed. */
  onChangeCount?: (count: number) => void;
}

/**
 * A real Monaco diff editor: side-by-side or inline, with the built-in change
 * navigation (F7 and Shift+F7) and collapsed unchanged regions. Read-only; it is
 * for reviewing a change, not editing it. The local monaco-setup import keeps it
 * offline, like the main editor.
 */
export function DiffView({ original, modified, language, sideBySide = true, onChangeCount }: DiffViewProps) {
  const monacoTheme = useMonacoTheme();
  const settings = useSyncExternalStore(subscribeEditorSettings, getEditorSettings, getEditorSettings);
  const onMount = (editor: DiffEditorHandle) => {
    const report = () => onChangeCount?.(editor.getLineChanges()?.length ?? 0);
    editor.onDidUpdateDiff(report);
    report();
  };
  return (
    <DiffEditor
      height="100%"
      theme={monacoTheme}
      language={language}
      original={original}
      modified={modified}
      onMount={onMount}
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
        ignoreTrimWhitespace: settings.diffIgnoreTrimWhitespace,
        diffAlgorithm: settings.diffAlgorithm,
        maxComputationTime: settings.diffMaxComputationTime,
      }}
    />
  );
}
