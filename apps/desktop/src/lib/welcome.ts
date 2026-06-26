/**
 * Data and the pure action list for the Welcome page. The component renders these;
 * App maps each action id to the real callback. Kept pure so the action list (which
 * varies with what is available) is unit tested.
 */
export interface WelcomeTip {
  readonly keys: string;
  readonly text: string;
}

export const WELCOME_TIPS: readonly WelcomeTip[] = [
  { keys: 'Ctrl/Cmd+P', text: 'Quickly open any file by name.' },
  { keys: 'Ctrl/Cmd+Shift+P', text: 'Run any command from the palette.' },
  { keys: 'Ctrl/Cmd+Shift+F', text: 'Search across the whole project.' },
  { keys: 'Ctrl/Cmd+Shift+G', text: 'Stage and commit from Source Control.' },
  { keys: 'Ctrl/Cmd+,', text: 'Open Settings to tune the editor.' },
];

export type WelcomeActionId =
  | 'open-folder'
  | 'new-file'
  | 'open-settings'
  | 'open-shortcuts'
  | 'run-agent';

export interface WelcomeAction {
  readonly id: WelcomeActionId;
  readonly label: string;
}

/** The Start actions, filtered to what is available right now. */
export function welcomeQuickActions(opts: {
  canOpenFolder: boolean;
  hasWorkspace: boolean;
  liveAvailable: boolean;
}): WelcomeAction[] {
  const actions: WelcomeAction[] = [];
  if (opts.canOpenFolder) actions.push({ id: 'open-folder', label: 'Open Folder' });
  if (opts.hasWorkspace) actions.push({ id: 'new-file', label: 'New File' });
  actions.push({ id: 'open-settings', label: 'Open Settings' });
  actions.push({ id: 'open-shortcuts', label: 'Keyboard Shortcuts' });
  if (opts.liveAvailable) actions.push({ id: 'run-agent', label: 'Run a Real Agent Session' });
  return actions;
}
