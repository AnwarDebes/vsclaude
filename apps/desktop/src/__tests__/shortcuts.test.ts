import { describe, expect, it } from 'vitest';
import type { Command } from '@vsclaude/core-shell';
import { filterShortcutRows, shortcutRows } from '../lib/shortcuts';

const commands: Command[] = [
  { id: 'go-to-line', title: 'Go to Line/Column', keybinding: 'Ctrl+G', run: () => {} },
  { id: 'open-settings', title: 'Preferences: Open Settings', keybinding: 'Ctrl+,', run: () => {} },
  { id: 'compare-saved', title: 'Compare with Saved', run: () => {} },
];

describe('shortcutRows', () => {
  it('maps commands to rows sorted by title, with an empty keybinding when unbound', () => {
    const rows = shortcutRows(commands);
    expect(rows.map((r) => r.title)).toEqual([
      'Compare with Saved',
      'Go to Line/Column',
      'Preferences: Open Settings',
    ]);
    expect(rows.find((r) => r.id === 'compare-saved')?.keybinding).toBe('');
    expect(rows.find((r) => r.id === 'go-to-line')?.keybinding).toBe('Ctrl+G');
  });
});

describe('filterShortcutRows', () => {
  const rows = shortcutRows(commands);

  it('returns every row for an empty query', () => {
    expect(filterShortcutRows('', rows)).toHaveLength(rows.length);
  });

  it('matches on title, id, and keybinding', () => {
    expect(filterShortcutRows('settings', rows).map((r) => r.id)).toEqual(['open-settings']);
    expect(filterShortcutRows('ctrl+g', rows).map((r) => r.id)).toEqual(['go-to-line']);
    expect(filterShortcutRows('compare-saved', rows).map((r) => r.id)).toEqual(['compare-saved']);
  });

  it('returns nothing when no row matches', () => {
    expect(filterShortcutRows('zzznope', rows)).toHaveLength(0);
  });
});
