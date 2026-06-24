import { describe, expect, it } from 'vitest';
import {
  EMPTY_TERMINAL_TABS,
  activateTerminal,
  closeTerminal,
  openTerminal,
  renameTerminal,
} from '../index.js';

const tab = (id: string, title = id) => ({ id, title });

function withThree() {
  let state = EMPTY_TERMINAL_TABS;
  state = openTerminal(state, tab('a'));
  state = openTerminal(state, tab('b'));
  state = openTerminal(state, tab('c'));
  return state;
}

describe('terminal tabs model', () => {
  it('opens a terminal and focuses it', () => {
    const state = openTerminal(EMPTY_TERMINAL_TABS, tab('a'));
    expect(state.tabs.map((t) => t.id)).toEqual(['a']);
    expect(state.activeId).toBe('a');
  });

  it('re-opening an existing id just focuses it', () => {
    const state = activateTerminal(withThree(), 'a');
    const reopened = openTerminal(state, tab('c'));
    expect(reopened.tabs.map((t) => t.id)).toEqual(['a', 'b', 'c']);
    expect(reopened.activeId).toBe('c');
  });

  it('moves focus to the next tab when the active middle tab closes', () => {
    const state = activateTerminal(withThree(), 'b');
    const closed = closeTerminal(state, 'b');
    expect(closed.tabs.map((t) => t.id)).toEqual(['a', 'c']);
    expect(closed.activeId).toBe('c');
  });

  it('moves focus to the previous tab when the active last tab closes', () => {
    const state = withThree(); // active is 'c'
    const closed = closeTerminal(state, 'c');
    expect(closed.tabs.map((t) => t.id)).toEqual(['a', 'b']);
    expect(closed.activeId).toBe('b');
  });

  it('leaves the active tab unchanged when a different tab closes', () => {
    const state = activateTerminal(withThree(), 'a');
    const closed = closeTerminal(state, 'c');
    expect(closed.activeId).toBe('a');
  });

  it('clears the active tab when the last terminal closes', () => {
    let state = openTerminal(EMPTY_TERMINAL_TABS, tab('a'));
    state = closeTerminal(state, 'a');
    expect(state.tabs).toHaveLength(0);
    expect(state.activeId).toBeNull();
  });

  it('renames a terminal without touching focus', () => {
    const state = renameTerminal(withThree(), 'a', 'build');
    expect(state.tabs.find((t) => t.id === 'a')?.title).toBe('build');
    expect(state.activeId).toBe('c');
  });

  it('ignores operations on unknown ids', () => {
    const state = withThree();
    expect(closeTerminal(state, 'zzz')).toBe(state);
    expect(activateTerminal(state, 'zzz')).toBe(state);
    expect(renameTerminal(state, 'zzz', 'x')).toBe(state);
  });
});
