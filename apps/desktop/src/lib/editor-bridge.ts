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
  /** Look up a built-in editor action by id, when available. */
  getAction?(id: string): { run(): unknown } | null;
  /** Trigger a command on the editor, the fallback when no action is registered. */
  trigger?(source: string | null | undefined, handlerId: string, payload?: unknown): void;
}

/** A snapshot of the active editor's state, for the status bar. */
export interface EditorStatus {
  /** One-based caret line. */
  readonly line: number;
  /** One-based caret column. */
  readonly column: number;
  /** Number of selected characters across all selections; 0 when none. */
  readonly selectionCount: number;
  /** Monaco language id, for example "typescript". */
  readonly language: string;
  /** End-of-line style of the model. */
  readonly eol: 'LF' | 'CRLF';
  /** Indentation in effect for the model. */
  readonly indent: { readonly insertSpaces: boolean; readonly tabSize: number };
}

let activeEditor: BridgeEditor | null = null;
let editorStatus: EditorStatus | null = null;
let languageSetter: ((languageId: string) => void) | null = null;
const statusListeners = new Set<() => void>();

function emitStatus(): void {
  for (const listener of statusListeners) listener();
}

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

/** Publish the latest editor status snapshot (or null when no editor is active). */
export function setEditorStatus(next: EditorStatus | null): void {
  editorStatus = next;
  emitStatus();
}

/** The current editor status snapshot, or null. */
export function getEditorStatus(): EditorStatus | null {
  return editorStatus;
}

/** Subscribe to status changes. Returns an unsubscribe function. */
export function subscribeEditorStatus(listener: () => void): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

/** The current active editor, or null when no editor is mounted. */
export function getActiveEditor(): BridgeEditor | null {
  return activeEditor;
}

/**
 * Register the function that changes the active editor's language (it needs the
 * Monaco namespace, which lives in the EditorPanel). Pass null on unmount.
 */
export function registerLanguageSetter(setter: ((languageId: string) => void) | null): void {
  languageSetter = setter;
}

/**
 * Change the active editor's language mode live. Returns true when an editor was
 * available to change, false otherwise (so a command is a no-op with no editor).
 */
export function setEditorLanguage(languageId: string): boolean {
  if (!languageSetter) return false;
  languageSetter(languageId);
  activeEditor?.focus();
  return true;
}

/**
 * Run a built-in Monaco action (for example `editor.action.deleteLines`) on the
 * active editor, then focus it so the result is visible. Prefers the registered
 * action and falls back to `trigger`. Returns true when an editor was available,
 * false otherwise, so a palette command is a no-op when no editor is open.
 */
export function runEditorAction(actionId: string): boolean {
  const editor = activeEditor;
  if (!editor) return false;
  const action = editor.getAction?.(actionId);
  if (action) {
    void action.run();
  } else if (editor.trigger) {
    editor.trigger('vsclaude', actionId, undefined);
  } else {
    return false;
  }
  editor.focus();
  return true;
}

/**
 * Insert a snippet (Monaco/TextMate body with tabstops) at the cursor of the
 * active editor and focus it, so the user lands on the first tabstop. Returns
 * true when an editor was available, false otherwise.
 */
export function insertSnippet(body: string): boolean {
  const editor = activeEditor;
  if (!editor?.trigger) return false;
  editor.focus();
  editor.trigger('vsclaude', 'editor.action.insertSnippet', { snippet: body });
  return true;
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
