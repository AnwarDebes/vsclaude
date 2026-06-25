/**
 * The editor command surface: Monaco's built-in editing actions, exposed in the
 * command palette so they are discoverable and not only reachable by their
 * keyboard shortcut. Each entry maps a palette command to a Monaco action id that
 * the editor bridge runs on the active editor. The keybinding labels are Monaco's
 * real defaults, so advertising them is honest.
 */
export interface EditorCommandDef {
  /** Palette command id. */
  readonly id: string;
  /** Human-readable title. */
  readonly title: string;
  /** The Monaco action id to run. */
  readonly actionId: string;
  /** Monaco's default shortcut for this action, shown in the palette. */
  readonly keybinding?: string;
  /** Extra search terms. */
  readonly keywords?: readonly string[];
}

export const EDITOR_COMMANDS: readonly EditorCommandDef[] = [
  // Line operations
  { id: 'editor.deleteLine', title: 'Delete Line', actionId: 'editor.action.deleteLines', keybinding: 'Ctrl+Shift+K', keywords: ['line', 'remove'] },
  { id: 'editor.moveLineUp', title: 'Move Line Up', actionId: 'editor.action.moveLinesUpAction', keybinding: 'Alt+Up', keywords: ['line'] },
  { id: 'editor.moveLineDown', title: 'Move Line Down', actionId: 'editor.action.moveLinesDownAction', keybinding: 'Alt+Down', keywords: ['line'] },
  { id: 'editor.copyLineUp', title: 'Copy Line Up', actionId: 'editor.action.copyLinesUpAction', keybinding: 'Shift+Alt+Up', keywords: ['line', 'duplicate'] },
  { id: 'editor.copyLineDown', title: 'Copy Line Down', actionId: 'editor.action.copyLinesDownAction', keybinding: 'Shift+Alt+Down', keywords: ['line', 'duplicate'] },
  { id: 'editor.indentLines', title: 'Indent Line', actionId: 'editor.action.indentLines', keywords: ['indent'] },
  { id: 'editor.outdentLines', title: 'Outdent Line', actionId: 'editor.action.outdentLines', keywords: ['outdent', 'dedent'] },
  { id: 'editor.indentationToSpaces', title: 'Convert Indentation to Spaces', actionId: 'editor.action.indentationToSpaces', keywords: ['indent', 'spaces', 'convert'] },
  { id: 'editor.indentationToTabs', title: 'Convert Indentation to Tabs', actionId: 'editor.action.indentationToTabs', keywords: ['indent', 'tabs', 'convert'] },
  { id: 'editor.joinLines', title: 'Join Lines', actionId: 'editor.action.joinLines', keywords: ['line', 'merge'] },
  { id: 'editor.insertLineAbove', title: 'Insert Line Above', actionId: 'editor.action.insertLineBefore', keybinding: 'Ctrl+Shift+Enter', keywords: ['line'] },
  { id: 'editor.insertLineBelow', title: 'Insert Line Below', actionId: 'editor.action.insertLineAfter', keybinding: 'Ctrl+Enter', keywords: ['line'] },
  { id: 'editor.transpose', title: 'Transpose Characters', actionId: 'editor.action.transpose', keywords: ['swap'] },
  { id: 'editor.sortAsc', title: 'Sort Lines Ascending', actionId: 'editor.action.sortLinesAscending', keywords: ['sort'] },
  { id: 'editor.sortDesc', title: 'Sort Lines Descending', actionId: 'editor.action.sortLinesDescending', keywords: ['sort'] },
  { id: 'editor.trimTrailing', title: 'Trim Trailing Whitespace', actionId: 'editor.action.trimTrailingWhitespace', keybinding: 'Ctrl+K Ctrl+X', keywords: ['whitespace'] },

  // Case transforms
  { id: 'editor.upper', title: 'Transform to Uppercase', actionId: 'editor.action.transformToUppercase', keywords: ['case'] },
  { id: 'editor.lower', title: 'Transform to Lowercase', actionId: 'editor.action.transformToLowercase', keywords: ['case'] },
  { id: 'editor.title', title: 'Transform to Title Case', actionId: 'editor.action.transformToTitlecase', keywords: ['case'] },

  // Multi-cursor and selection
  { id: 'editor.cursorAbove', title: 'Add Cursor Above', actionId: 'editor.action.insertCursorAbove', keybinding: 'Ctrl+Alt+Up', keywords: ['multi', 'cursor'] },
  { id: 'editor.cursorBelow', title: 'Add Cursor Below', actionId: 'editor.action.insertCursorBelow', keybinding: 'Ctrl+Alt+Down', keywords: ['multi', 'cursor'] },
  { id: 'editor.cursorsLineEnds', title: 'Add Cursors to Line Ends', actionId: 'editor.action.insertCursorAtEndOfEachLineSelected', keybinding: 'Shift+Alt+I', keywords: ['multi', 'cursor'] },
  { id: 'editor.addNextMatch', title: 'Add Selection to Next Find Match', actionId: 'editor.action.addSelectionToNextFindMatch', keybinding: 'Ctrl+D', keywords: ['multi', 'cursor', 'occurrence'] },
  { id: 'editor.selectAllMatches', title: 'Select All Occurrences', actionId: 'editor.action.selectHighlights', keybinding: 'Ctrl+Shift+L', keywords: ['multi', 'cursor', 'occurrence'] },
  { id: 'editor.expandSelection', title: 'Expand Selection', actionId: 'editor.action.smartSelect.expand', keybinding: 'Shift+Alt+Right', keywords: ['smart', 'scope'] },
  { id: 'editor.shrinkSelection', title: 'Shrink Selection', actionId: 'editor.action.smartSelect.shrink', keybinding: 'Shift+Alt+Left', keywords: ['smart', 'scope'] },

  // Comments
  { id: 'editor.commentLine', title: 'Toggle Line Comment', actionId: 'editor.action.commentLine', keybinding: 'Ctrl+/', keywords: ['comment'] },
  { id: 'editor.blockComment', title: 'Toggle Block Comment', actionId: 'editor.action.blockComment', keybinding: 'Shift+Alt+A', keywords: ['comment'] },

  // Formatting
  { id: 'editor.formatDocument', title: 'Format Document', actionId: 'editor.action.formatDocument', keybinding: 'Shift+Alt+F', keywords: ['format', 'beautify'] },
  { id: 'editor.formatSelection', title: 'Format Selection', actionId: 'editor.action.formatSelection', keywords: ['format'] },

  // View
  { id: 'editor.toggleWordWrap', title: 'Toggle Word Wrap', actionId: 'editor.action.toggleWordWrap', keybinding: 'Alt+Z', keywords: ['wrap'] },
  { id: 'editor.foldAll', title: 'Fold All', actionId: 'editor.foldAll', keybinding: 'Ctrl+K Ctrl+0', keywords: ['fold', 'collapse'] },
  { id: 'editor.unfoldAll', title: 'Unfold All', actionId: 'editor.unfoldAll', keybinding: 'Ctrl+K Ctrl+J', keywords: ['fold', 'expand'] },

  // Find and replace
  { id: 'editor.find', title: 'Find', actionId: 'actions.find', keybinding: 'Ctrl+F', keywords: ['search'] },
  { id: 'editor.replace', title: 'Replace', actionId: 'editor.action.startFindReplaceAction', keybinding: 'Ctrl+H', keywords: ['replace'] },
];
