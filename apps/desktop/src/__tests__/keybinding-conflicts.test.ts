import { describe, expect, it } from 'vitest';
import {
  conflictingKeys,
  findKeybindingConflicts,
  normalizeKeybinding,
} from '../lib/keybinding-conflicts';
import type { ShortcutRow } from '../lib/shortcuts';

const row = (id: string, keybinding: string): ShortcutRow => ({ id, title: id, keybinding });

describe('normalizeKeybinding', () => {
  it('is case insensitive', () => {
    expect(normalizeKeybinding('Ctrl+G')).toBe(normalizeKeybinding('ctrl+g'));
  });

  it('ignores modifier order', () => {
    expect(normalizeKeybinding('Shift+Alt+Up')).toBe(normalizeKeybinding('Alt+Shift+Up'));
  });

  it('normalizes each segment of a chord', () => {
    expect(normalizeKeybinding('Ctrl+K Ctrl+X')).toBe('ctrl+k ctrl+x');
    expect(normalizeKeybinding('Ctrl+K  Ctrl+X')).toBe('ctrl+k ctrl+x');
  });

  it('keeps distinct gestures distinct', () => {
    expect(normalizeKeybinding('Ctrl+F')).not.toBe(normalizeKeybinding('Ctrl+H'));
    expect(normalizeKeybinding('Ctrl+K Ctrl+X')).not.toBe(normalizeKeybinding('Ctrl+K Ctrl+0'));
  });

  it('preserves the literal plus key instead of dropping it', () => {
    // "Ctrl++" (zoom in) must not collapse to a bare "Ctrl".
    expect(normalizeKeybinding('Ctrl++')).not.toBe(normalizeKeybinding('Ctrl'));
    expect(normalizeKeybinding('Ctrl++')).not.toBe(normalizeKeybinding('Ctrl+-'));
    expect(normalizeKeybinding('Ctrl++')).toBe(normalizeKeybinding('ctrl++'));
    expect(normalizeKeybinding('+')).not.toBe(normalizeKeybinding(''));
  });

  it('keeps punctuation keys distinct', () => {
    // Real registry gestures: Open Settings (Ctrl+,) and Toggle Comment (Ctrl+/).
    expect(normalizeKeybinding('Ctrl+,')).not.toBe(normalizeKeybinding('Ctrl+/'));
    expect(normalizeKeybinding('Ctrl+,')).toBe(normalizeKeybinding('ctrl+,'));
  });

  it('keeps the key positionally fixed so it never reorders against a modifier', () => {
    // The key is always the last token, so a key that happens to be a modifier
    // name does not collapse into the modifier set.
    expect(normalizeKeybinding('Ctrl+Shift')).not.toBe(normalizeKeybinding('Shift+Ctrl'));
  });
});

describe('findKeybindingConflicts', () => {
  it('returns nothing when every gesture is unique', () => {
    const rows = [row('a', 'Ctrl+F'), row('b', 'Ctrl+H'), row('c', 'Ctrl+K Ctrl+X')];
    expect(findKeybindingConflicts(rows)).toEqual([]);
  });

  it('groups commands that share a gesture, ignoring case and modifier order', () => {
    const rows = [
      row('find', 'Ctrl+F'),
      row('also-find', 'ctrl+f'),
      row('copy-up', 'Shift+Alt+Up'),
      row('move-up', 'Alt+Shift+Up'),
      row('alone', 'Ctrl+G'),
    ];
    const conflicts = findKeybindingConflicts(rows);
    expect(conflicts).toHaveLength(2);
    const byKey = Object.fromEntries(conflicts.map((c) => [c.keybinding, c.commands.map((r) => r.id)]));
    expect(byKey['Ctrl+F']).toEqual(['find', 'also-find']);
    expect(byKey['Shift+Alt+Up']).toEqual(['copy-up', 'move-up']);
  });

  it('ignores rows with no keybinding', () => {
    const rows = [row('a', ''), row('b', ''), row('c', '   ')];
    expect(findKeybindingConflicts(rows)).toEqual([]);
  });

  it('labels a conflict with the first command original keybinding', () => {
    const conflicts = findKeybindingConflicts([row('a', 'Alt+Shift+Up'), row('b', 'Shift+Alt+Up')]);
    expect(conflicts[0]?.keybinding).toBe('Alt+Shift+Up');
  });

  it('returns conflicts sorted by displayed gesture', () => {
    const rows = [
      row('z1', 'Ctrl+Z'),
      row('z2', 'Ctrl+Z'),
      row('a1', 'Ctrl+A'),
      row('a2', 'Ctrl+A'),
    ];
    expect(findKeybindingConflicts(rows).map((c) => c.keybinding)).toEqual(['Ctrl+A', 'Ctrl+Z']);
  });
});

describe('conflictingKeys', () => {
  it('returns the normalized gestures that are in conflict', () => {
    const conflicts = findKeybindingConflicts([row('a', 'Ctrl+F'), row('b', 'ctrl+f')]);
    const keys = conflictingKeys(conflicts);
    expect(keys.has(normalizeKeybinding('Ctrl+F'))).toBe(true);
    expect(keys.has(normalizeKeybinding('Ctrl+G'))).toBe(false);
  });
});
