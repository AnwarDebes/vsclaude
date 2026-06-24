/**
 * Reduces the diagnostics to a per-file worst severity, so the explorer can mark
 * files that have errors or warnings. Errors win over warnings; info and hints do
 * not decorate. Pure, so it is unit tested.
 */
import type { Diagnostic } from '@vsclaude/core-shell';

export type ProblemSeverity = 'error' | 'warning';

export function filesWithProblems(diagnostics: Diagnostic[]): Record<string, ProblemSeverity> {
  const out: Record<string, ProblemSeverity> = {};
  for (const diagnostic of diagnostics) {
    if (diagnostic.severity === 'error') {
      out[diagnostic.resource] = 'error';
    } else if (diagnostic.severity === 'warning' && out[diagnostic.resource] !== 'error') {
      out[diagnostic.resource] = 'warning';
    }
  }
  return out;
}
