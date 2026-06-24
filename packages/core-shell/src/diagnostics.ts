/**
 * The diagnostics model for the vsclaude shell.
 *
 * A diagnostic is one problem at a location in a file: an error, a warning, or a
 * weaker hint. The editor's language workers produce them today, an external
 * language server or a task problem matcher will produce them later, and the
 * Problems panel and the status bar consume them. Keeping the shape and the
 * grouping here, pure and testable, means none of those producers or consumers
 * has to agree on anything but this model.
 */

/** Severity of a diagnostic, from most to least urgent. */
export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';

/** One problem reported at a location in a file. */
export interface Diagnostic {
  /** The file the problem is in. */
  readonly resource: string;
  /** The human-readable message. */
  readonly message: string;
  /** How urgent the problem is. */
  readonly severity: DiagnosticSeverity;
  /** One-based line of the problem. */
  readonly line: number;
  /** One-based column of the problem. */
  readonly column: number;
  /** The producer, for example "ts" or "json". */
  readonly source?: string;
  /** An optional diagnostic code. */
  readonly code?: string;
}

/** Counts of diagnostics by severity. */
export interface DiagnosticCounts {
  readonly error: number;
  readonly warning: number;
  readonly info: number;
  readonly hint: number;
}

/** A file and its diagnostics, for the grouped Problems view. */
export interface DiagnosticGroup {
  readonly resource: string;
  readonly diagnostics: Diagnostic[];
}

const SEVERITY_RANK: Record<DiagnosticSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
  hint: 3,
};

/** Sort rank for a severity: errors first (0), hints last (3). */
export function severityRank(severity: DiagnosticSeverity): number {
  return SEVERITY_RANK[severity];
}

/**
 * Order two diagnostics for display: most urgent severity first, then by line,
 * then by column. Stable and total, so it is safe to pass to Array.sort.
 */
export function compareDiagnostics(a: Diagnostic, b: Diagnostic): number {
  const bySeverity = severityRank(a.severity) - severityRank(b.severity);
  if (bySeverity !== 0) return bySeverity;
  if (a.line !== b.line) return a.line - b.line;
  return a.column - b.column;
}

/** Count diagnostics by severity. */
export function summarizeDiagnostics(items: readonly Diagnostic[]): DiagnosticCounts {
  let error = 0;
  let warning = 0;
  let info = 0;
  let hint = 0;
  for (const item of items) {
    if (item.severity === 'error') error += 1;
    else if (item.severity === 'warning') warning += 1;
    else if (item.severity === 'info') info += 1;
    else hint += 1;
  }
  return { error, warning, info, hint };
}

/**
 * Group diagnostics by file for the Problems panel. Groups are sorted by resource
 * path, and the diagnostics inside each group are sorted by severity then
 * position. The input is not mutated.
 */
export function groupDiagnosticsByResource(items: readonly Diagnostic[]): DiagnosticGroup[] {
  const byResource = new Map<string, Diagnostic[]>();
  for (const item of items) {
    const bucket = byResource.get(item.resource);
    if (bucket) bucket.push(item);
    else byResource.set(item.resource, [item]);
  }
  return Array.from(byResource.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([resource, diagnostics]) => ({
      resource,
      diagnostics: [...diagnostics].sort(compareDiagnostics),
    }));
}
