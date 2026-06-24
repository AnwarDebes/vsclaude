/**
 * A tiny registry for the active Monaco editor.
 *
 * The editing surface lives inside Monaco, but palette actions (go to line now,
 * the full editor command surface next) need to reach the editor the user is
 * looking at without threading a ref through the whole component tree. The
 * EditorPanel publishes its editor here on mount and clears it on unmount, and
 * the palette calls these helpers. The Monaco types are kept loose on purpose so
 * this module does not pull the editor types into every caller; the only methods
 * used are revealing, positioning, and focusing.
 */

/** The slice of the Monaco editor API the bridge uses. */
export interface BridgeEditor {
  revealLineInCenter(lineNumber: number): void;
  setPosition(position: { lineNumber: number; column: number }): void;
  getModel(): { getLineCount(): number } | null;
  focus(): void;
}

let activeEditor: BridgeEditor | null = null;

/** Publish the editor that should receive palette actions. */
export function setActiveEditor(editor: BridgeEditor): void {
  activeEditor = editor;
}

/** Clear the active editor, but only if `editor` is still the active one. */
export function clearActiveEditor(editor: BridgeEditor): void {
  if (activeEditor === editor) {
    activeEditor = null;
  }
}

/** The current active editor, or null when no editor is mounted. */
export function getActiveEditor(): BridgeEditor | null {
  return activeEditor;
}

/**
 * Reveal and select a line (and optional column) in the active editor, then
 * focus it. The line is clamped to the document's bounds so a too-large number
 * from `:9999` lands on the last line rather than failing. Returns true when an
 * editor was available to jump, false otherwise.
 */
export function gotoLine(line: number, column = 1): boolean {
  const editor = activeEditor;
  if (!editor) return false;
  const lineCount = editor.getModel()?.getLineCount() ?? line;
  const target = Math.max(1, Math.min(line, lineCount));
  editor.revealLineInCenter(target);
  editor.setPosition({ lineNumber: target, column: Math.max(1, column) });
  editor.focus();
  return true;
}
