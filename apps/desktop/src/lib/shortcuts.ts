/**
 * Pure helpers for the Keyboard Shortcuts reference: turn the registered commands
 * into sorted rows and filter them by a free-text query. Kept out of the
 * component so the listing logic is unit tested.
 */
import type { Command } from '@vsclaude/core-shell';

export interface ShortcutRow {
  id: string;
  title: string;
  /** The command's shortcut label, or an empty string when it has none. */
  keybinding: string;
}

/** Turn commands into shortcut rows, sorted alphabetically by title. */
export function shortcutRows(commands: readonly Command[]): ShortcutRow[] {
  return commands
    .map((c) => ({ id: c.id, title: c.title, keybinding: c.keybinding ?? '' }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

/** Filter rows by a query over the title, id, and keybinding. */
export function filterShortcutRows(query: string, rows: readonly ShortcutRow[]): ShortcutRow[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [...rows];
  return rows.filter((r) => `${r.title} ${r.id} ${r.keybinding}`.toLowerCase().includes(q));
}
