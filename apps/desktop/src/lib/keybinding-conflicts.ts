/**
 * Per-key conflict detection for the Keyboard Shortcuts reference. Two commands
 * conflict when they bind the same key gesture, so a user pressing it would get
 * an ambiguous result. The detection is kept pure (no React, no registry) so the
 * grouping and normalization are unit tested.
 */
import type { ShortcutRow } from './shortcuts';

export interface KeybindingConflict {
  /** The shared gesture, shown using the first command's original label. */
  keybinding: string;
  /** Every command bound to that gesture, in their incoming order. */
  commands: ShortcutRow[];
}

/**
 * Reduce a keybinding label to a canonical form so equivalent gestures compare
 * equal regardless of case or modifier order. A chord (space separated segments
 * like "Ctrl+K Ctrl+X") normalizes segment by segment, preserving segment order.
 * Within a segment the final "+" separated component is the key and the rest are
 * modifiers: modifiers are lowercased and sorted (so "Shift+Alt+Up" and
 * "Alt+Shift+Up" match), while the key is lowercased and kept last so it never
 * reorders against a modifier. The literal "+" key is preserved: a label ending
 * in "++" (for example "Ctrl++") keeps "+" as its key rather than dropping it.
 */
export function normalizeKeybinding(keybinding: string): string {
  return keybinding
    .trim()
    .split(/\s+/)
    .filter((segment) => segment.length > 0)
    .map(normalizeSegment)
    .join(' ');
}

/** Normalize one chord segment: sorted modifiers followed by the single key. */
function normalizeSegment(segment: string): string {
  let modifiers: string;
  let key: string;
  if (segment.endsWith('+')) {
    // The key is the literal "+". Strip it, then strip the separator before it.
    key = '+';
    const rest = segment.slice(0, -1);
    modifiers = rest.endsWith('+') ? rest.slice(0, -1) : rest;
  } else {
    const lastPlus = segment.lastIndexOf('+');
    key = lastPlus === -1 ? segment : segment.slice(lastPlus + 1);
    modifiers = lastPlus === -1 ? '' : segment.slice(0, lastPlus);
  }

  const sortedModifiers = modifiers
    .split('+')
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 0)
    .sort();

  return [...sortedModifiers, key.trim().toLowerCase()].filter((token) => token.length > 0).join('+');
}

/**
 * Group shortcut rows by their normalized keybinding and return only the groups
 * where more than one command shares a gesture. Rows with no keybinding are
 * ignored. Conflicts are returned sorted by their displayed gesture so the list
 * is stable.
 */
export function findKeybindingConflicts(rows: readonly ShortcutRow[]): KeybindingConflict[] {
  const groups = new Map<string, KeybindingConflict>();
  for (const row of rows) {
    if (row.keybinding.trim().length === 0) continue;
    const key = normalizeKeybinding(row.keybinding);
    const existing = groups.get(key);
    if (existing) existing.commands.push(row);
    else groups.set(key, { keybinding: row.keybinding, commands: [row] });
  }

  return [...groups.values()]
    .filter((group) => group.commands.length > 1)
    .sort((a, b) => a.keybinding.localeCompare(b.keybinding));
}

/** The set of normalized gestures that are in conflict, for per-row flagging. */
export function conflictingKeys(conflicts: readonly KeybindingConflict[]): Set<string> {
  return new Set(conflicts.map((c) => normalizeKeybinding(c.keybinding)));
}
