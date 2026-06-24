/**
 * Collects the editor's diagnostics into the normalized core-shell model.
 *
 * Monaco's bundled language workers (TypeScript, JavaScript, JSON, CSS) already
 * compute markers; this hook subscribes to marker changes, reads every model's
 * markers, and maps them to the shared `Diagnostic` shape the Problems panel and
 * the status bar consume. When a real language server arrives it publishes
 * markers the same way, so this hook does not change.
 */
import { useEffect, useState } from 'react';
import type { Diagnostic, DiagnosticSeverity } from '@vsclaude/core-shell';
import { monaco } from './monaco-setup';

function severityFromMarker(severity: number): DiagnosticSeverity {
  switch (severity) {
    case monaco.MarkerSeverity.Error:
      return 'error';
    case monaco.MarkerSeverity.Warning:
      return 'warning';
    case monaco.MarkerSeverity.Info:
      return 'info';
    default:
      return 'hint';
  }
}

function codeOf(code: monaco.editor.IMarker['code']): string | undefined {
  if (code === undefined) return undefined;
  return typeof code === 'string' ? code : code.value;
}

function markerToDiagnostic(marker: monaco.editor.IMarker): Diagnostic {
  return {
    resource: marker.resource.path.replace(/^\//, ''),
    message: marker.message,
    severity: severityFromMarker(marker.severity),
    line: marker.startLineNumber,
    column: marker.startColumn,
    source: marker.source,
    code: codeOf(marker.code),
  };
}

export function useDiagnostics(): Diagnostic[] {
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);

  useEffect(() => {
    const read = () => {
      setDiagnostics(monaco.editor.getModelMarkers({}).map(markerToDiagnostic));
    };
    read();
    const subscription = monaco.editor.onDidChangeMarkers(() => read());
    return () => subscription.dispose();
  }, []);

  return diagnostics;
}
