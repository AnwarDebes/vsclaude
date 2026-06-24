/**
 * Which activity-bar item is highlighted, derived from the open bottom panel.
 * Pure so it is unit testable; the Activity Bar uses it to show the active view.
 */
export type ActivityView = 'explorer' | 'search' | 'scm' | 'problems';

export function activeViewFor(
  bottomPanel: 'none' | 'problems' | 'search' | 'scm' | 'output',
): ActivityView {
  if (bottomPanel === 'search') return 'search';
  if (bottomPanel === 'scm') return 'scm';
  if (bottomPanel === 'problems') return 'problems';
  return 'explorer';
}

/** A short badge label for a count, or undefined when there is nothing to show. */
export function formatBadge(count: number): string | undefined {
  if (count <= 0) return undefined;
  return count > 99 ? '99+' : String(count);
}
