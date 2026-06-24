import { describe, expect, it } from 'vitest';
import { MENU_BAR } from '../lib/menus';

describe('MENU_BAR', () => {
  it('has the expected top-level menus', () => {
    expect(MENU_BAR.map((m) => m.label)).toEqual(['File', 'Edit', 'View', 'Go', 'Help']);
  });

  it('gives every item a label and a command', () => {
    for (const menu of MENU_BAR) {
      expect(menu.items.length).toBeGreaterThan(0);
      for (const item of menu.items) {
        expect(item.label.length).toBeGreaterThan(0);
        expect(item.command.length).toBeGreaterThan(0);
      }
    }
  });

  it('uses unique command ids across the bar', () => {
    const commands = MENU_BAR.flatMap((m) => m.items.map((i) => i.command));
    expect(new Set(commands).size).toBe(commands.length);
  });
});
