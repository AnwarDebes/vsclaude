/**
 * The terminal tabs model: a pure reducer over the set of open terminals and the
 * active one. The renderer owns the xterm and PTY per tab; this module only tracks
 * which terminals exist and which is focused, so the open, close, activate, and
 * rename logic (including which neighbor takes focus when the active tab closes)
 * is testable without a DOM.
 */

/** One terminal tab. */
export interface TerminalTab {
  readonly id: string;
  readonly title: string;
  /** A command to run when the terminal opens (for example a task). */
  readonly command?: string;
}

/** The set of open terminals and the active one. */
export interface TerminalTabsState {
  readonly tabs: readonly TerminalTab[];
  readonly activeId: string | null;
}

/** The empty starting state. */
export const EMPTY_TERMINAL_TABS: TerminalTabsState = { tabs: [], activeId: null };

/** Add a terminal and focus it. Re-adding an existing id just focuses it. */
export function openTerminal(state: TerminalTabsState, tab: TerminalTab): TerminalTabsState {
  if (state.tabs.some((t) => t.id === tab.id)) {
    return { ...state, activeId: tab.id };
  }
  return { tabs: [...state.tabs, tab], activeId: tab.id };
}

/**
 * Close a terminal. When the active terminal closes, focus moves to the tab that
 * took its slot (the next one, or the previous one when it was last), matching the
 * editor's close behavior. Closing the last terminal leaves no active tab.
 */
export function closeTerminal(state: TerminalTabsState, id: string): TerminalTabsState {
  const index = state.tabs.findIndex((t) => t.id === id);
  if (index === -1) return state;
  const tabs = state.tabs.filter((t) => t.id !== id);
  let activeId = state.activeId;
  if (state.activeId === id) {
    activeId = tabs.length === 0 ? null : tabs[Math.min(index, tabs.length - 1)]?.id ?? null;
  }
  return { tabs, activeId };
}

/** Focus a terminal, if it exists. */
export function activateTerminal(state: TerminalTabsState, id: string): TerminalTabsState {
  if (!state.tabs.some((t) => t.id === id)) return state;
  return { ...state, activeId: id };
}

/** Rename a terminal, if it exists. */
export function renameTerminal(state: TerminalTabsState, id: string, title: string): TerminalTabsState {
  if (!state.tabs.some((t) => t.id === id)) return state;
  return { ...state, tabs: state.tabs.map((t) => (t.id === id ? { ...t, title } : t)) };
}
