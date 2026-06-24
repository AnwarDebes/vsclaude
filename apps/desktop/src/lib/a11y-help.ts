/**
 * Static guidance for the accessibility help dialog: how to drive vsclaude from the
 * keyboard and which accessibility affordances exist. Pure data, so the structure is
 * unit tested; the dialog renders it.
 */
export interface HelpEntry {
  title: string;
  detail: string;
}

export const ACCESSIBILITY_HELP: readonly HelpEntry[] = [
  {
    title: 'Command palette',
    detail: 'Press Ctrl or Cmd plus K to run any command by name, or Ctrl or Cmd plus P to open a file.',
  },
  {
    title: 'Move between regions',
    detail: 'Use Tab and Shift plus Tab to move focus; lists, trees, and tab bars support the arrow keys.',
  },
  {
    title: 'Narration',
    detail: 'A live region announces agent activity for screen readers as the session plays.',
  },
  {
    title: 'Reduced motion',
    detail: 'Turn on reduced motion in settings to pause animation; state stays described in text.',
  },
  {
    title: 'High contrast',
    detail: 'A high-contrast theme and a color-blind-safe theme are available in settings.',
  },
  {
    title: 'Dismiss dialogs',
    detail: 'Press Escape to close any dialog, menu, or overlay.',
  },
];
