import type { Diagnostic, DiagnosticSeverity } from '@vsclaude/core-shell';

/** The severities the Problems panel offers as toggle buttons. */
export const FILTER_SEVERITIES: readonly DiagnosticSeverity[] = ['error', 'warning', 'info'];

export interface ProblemFilter {
  /** Substring matched against the message and file path, case-insensitively. */
  text: string;
  /** Severities to keep. */
  severities: ReadonlySet<DiagnosticSeverity>;
}

/** Filter diagnostics by a text query and a set of allowed severities. Pure, so it is unit tested. */
export function filterDiagnostics(items: readonly Diagnostic[], filter: ProblemFilter): Diagnostic[] {
  const query = filter.text.trim().toLowerCase();
  return items.filter((d) => {
    if (!filter.severities.has(d.severity)) return false;
    if (!query) return true;
    return d.message.toLowerCase().includes(query) || d.resource.toLowerCase().includes(query);
  });
}
