/**
 * Which activity-bar item is highlighted, derived from the open bottom panel.
 * Pure so it is unit testable; the Activity Bar uses it to show the active view.
 */
export type ActivityView = 'explorer' | 'search' | 'scm';

export function activeViewFor(bottomPanel: 'none' | 'problems' | 'search' | 'scm'): ActivityView {
  if (bottomPanel === 'search') return 'search';
  if (bottomPanel === 'scm') return 'scm';
  return 'explorer';
}
