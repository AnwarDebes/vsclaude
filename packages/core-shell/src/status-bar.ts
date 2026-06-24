/**
 * The status-bar item model for the vsclaude shell.
 *
 * The status bar is data driven: the app assembles a flat list of items and the
 * bar renders them in two groups. Keeping the model here, pure and testable,
 * lets later features (a problems count, a search indicator, a task or debug
 * state, and eventually plugins) contribute items the same way the editor and
 * git status do, instead of each hand-rolling a corner of the bar.
 */

/** One entry shown in the status bar. */
export interface StatusBarItem {
  /** Stable unique identifier. */
  readonly id: string;
  /** The text shown for the item. */
  readonly text: string;
  /** Which end of the bar the item sits on. */
  readonly side: 'left' | 'right';
  /** Within a side, higher priority sorts first. Defaults to 0. */
  readonly priority?: number;
  /** Hover and title text. */
  readonly tooltip?: string;
  /** Accessible label; falls back to the text when omitted. */
  readonly ariaLabel?: string;
  /** A command id to run when the item is clicked. Omitted items are static. */
  readonly command?: string;
}

/**
 * Filter the items to one side and sort them for display: highest priority
 * first, then by id so the order is stable when priorities tie. The input array
 * is not mutated.
 */
export function orderStatusItems(
  items: readonly StatusBarItem[],
  side: 'left' | 'right',
): StatusBarItem[] {
  return items
    .filter((item) => item.side === side)
    .sort((a, b) => {
      const byPriority = (b.priority ?? 0) - (a.priority ?? 0);
      if (byPriority !== 0) return byPriority;
      return a.id.localeCompare(b.id);
    });
}
