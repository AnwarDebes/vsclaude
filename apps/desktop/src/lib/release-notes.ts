/**
 * The content for the What's New / Release Notes panel: a categorized summary of
 * what the editor can do. Plain data so it is easy to extend and is unit tested
 * for shape (every section has a title and at least one item).
 */
export interface ReleaseSection {
  title: string;
  items: string[];
}

export const RELEASE_NOTES: ReleaseSection[] = [
  {
    title: 'Editor',
    items: [
      'A Monaco editor with theme binding and configurable font, tab size, word wrap, line numbers, rulers, whitespace, and cursor style',
      'Breadcrumbs above the editor and a document outline for Markdown',
      'Clickable links and inline color swatches in any file',
      'A safe Markdown preview',
    ],
  },
  {
    title: 'Navigation',
    items: [
      'A unified command palette with quick open, go to line, and command search',
      'Project-wide search across files',
      'An activity bar with problem and change-count badges',
    ],
  },
  {
    title: 'Source control',
    items: [
      'Stage, unstage, commit, branch, and stash from the Source Control panel',
      'A commit history view',
      'Diff review before committing',
    ],
  },
  {
    title: 'Workbench',
    items: [
      'Problems, Search, Source Control, Output, and Outline drawers',
      'A status bar, zen mode, file-type icons, and a welcome page',
      'An integrated terminal with tabs and task running',
    ],
  },
];
