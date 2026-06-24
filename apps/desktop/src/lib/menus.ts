/**
 * The menu-bar structure: top-level menus, each a list of items that run a command
 * by id. The ids match commands registered in App, so the menu bar is just another
 * surface onto the command registry. Pure data, so the structure is unit tested.
 */
export interface MenuItem {
  readonly label: string;
  readonly command: string;
}

export interface Menu {
  readonly label: string;
  readonly items: readonly MenuItem[];
}

export const MENU_BAR: readonly Menu[] = [
  {
    label: 'File',
    items: [
      { label: 'New File', command: 'new-file' },
      { label: 'New Untitled File', command: 'new-untitled' },
      { label: 'Open Folder', command: 'open-folder' },
      { label: 'Save All', command: 'save-all' },
      { label: 'Settings', command: 'open-settings' },
    ],
  },
  {
    label: 'Edit',
    items: [
      { label: 'Undo', command: 'edit-undo' },
      { label: 'Redo', command: 'edit-redo' },
      { label: 'Cut', command: 'edit-cut' },
      { label: 'Copy', command: 'edit-copy' },
      { label: 'Paste', command: 'edit-paste' },
      { label: 'Find', command: 'edit-find' },
      { label: 'Replace', command: 'edit-replace' },
    ],
  },
  {
    label: 'View',
    items: [
      { label: 'Command Palette', command: 'show-commands' },
      { label: 'Problems', command: 'view-problems' },
      { label: 'Search', command: 'view-search' },
      { label: 'Source Control', command: 'view-scm' },
      { label: 'Output', command: 'view-output' },
      { label: 'Outline', command: 'view-outline' },
      { label: 'Zen Mode', command: 'toggle-zen' },
      { label: 'Reset Layout', command: 'view-reset-layout' },
    ],
  },
  {
    label: 'Go',
    items: [
      { label: 'Go to File', command: 'quick-open-file' },
      { label: 'Go to Line', command: 'go-to-line' },
    ],
  },
  {
    label: 'Help',
    items: [
      { label: 'Welcome', command: 'help-welcome' },
      { label: 'Release Notes', command: 'help-release-notes' },
      { label: 'Keyboard Shortcuts', command: 'open-keyboard-shortcuts' },
    ],
  },
];
