/**
 * A small store for the live editor settings, so the Monaco editor and the diff
 * view can read them without prop drilling through the workspace tree. App writes
 * the current settings here whenever they change; the editor subscribes.
 */
import { DEFAULT_SETTINGS, type EditorSettings } from '@vsclaude/contracts';

/** Monaco construction options derived from the editor settings. */
export interface MonacoEditorOptions {
  fontSize: number;
  fontFamily: string;
  fontLigatures: boolean;
  tabSize: number;
  insertSpaces: boolean;
  detectIndentation: boolean;
  wordWrap: 'on' | 'off';
  wordBasedSuggestions: 'off' | 'currentDocument' | 'matchingDocuments' | 'allDocuments';
  columnSelection: boolean;
  occurrencesHighlight: 'off' | 'singleFile' | 'multiFile';
  dragAndDrop: boolean;
  emptySelectionClipboard: boolean;
  multiCursorPaste: 'spread' | 'full';
  minimap: { enabled: boolean; side: 'left' | 'right'; size: 'proportional' | 'fill' | 'fit' };
  lineNumbers: 'on' | 'off' | 'relative';
  rulers: number[];
  renderWhitespace: 'none' | 'selection' | 'all';
  renderControlCharacters: boolean;
  renderFinalNewline: 'on' | 'off' | 'dimmed';
  cursorStyle: 'line' | 'block' | 'underline';
  cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';
  cursorSmoothCaretAnimation: 'off' | 'explicit' | 'on';
  cursorSurroundingLines: number;
  lineHeight: number;
  fontWeight: string;
  mouseWheelZoom: boolean;
  smoothScrolling: boolean;
  fastScrollSensitivity: number;
  scrollBeyondLastLine: boolean;
  folding: boolean;
  stickyScroll: { enabled: boolean };
  guides: { bracketPairs: boolean; indentation: boolean };
  bracketPairColorization: { enabled: boolean };
  autoClosingBrackets: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never';
  autoClosingQuotes: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never';
  autoSurround: 'languageDefined' | 'quotes' | 'brackets' | 'never';
  matchBrackets: 'always' | 'near' | 'never';
  formatOnPaste: boolean;
  formatOnType: boolean;
}

/** Map the editor settings to Monaco's option names. */
export function editorSettingsToMonaco(settings: EditorSettings): MonacoEditorOptions {
  return {
    fontSize: settings.fontSize,
    fontFamily: settings.fontFamily,
    fontLigatures: settings.fontLigatures,
    tabSize: settings.tabSize,
    insertSpaces: settings.insertSpaces,
    detectIndentation: settings.detectIndentation,
    wordWrap: settings.wordWrap ? 'on' : 'off',
    wordBasedSuggestions: settings.wordBasedSuggestions,
    columnSelection: settings.columnSelection,
    occurrencesHighlight: settings.occurrencesHighlight,
    dragAndDrop: settings.dragAndDrop,
    emptySelectionClipboard: settings.emptySelectionClipboard,
    multiCursorPaste: settings.multiCursorPaste,
    minimap: { enabled: settings.minimap, side: settings.minimapSide, size: settings.minimapSize },
    lineNumbers: settings.lineNumbers,
    rulers: settings.rulers > 0 ? [settings.rulers] : [],
    renderWhitespace: settings.renderWhitespace,
    renderControlCharacters: settings.renderControlCharacters,
    renderFinalNewline: settings.renderFinalNewline ? 'on' : 'off',
    cursorStyle: settings.cursorStyle,
    cursorBlinking: settings.cursorBlinking,
    cursorSmoothCaretAnimation: settings.cursorSmoothCaretAnimation,
    cursorSurroundingLines: settings.cursorSurroundingLines,
    lineHeight: settings.lineHeight,
    fontWeight: settings.fontWeight,
    mouseWheelZoom: settings.mouseWheelZoom,
    smoothScrolling: settings.smoothScrolling,
    fastScrollSensitivity: settings.fastScrollSensitivity,
    scrollBeyondLastLine: settings.scrollBeyondLastLine,
    folding: settings.folding,
    stickyScroll: { enabled: settings.stickyScroll },
    guides: { bracketPairs: settings.bracketPairGuides, indentation: settings.indentGuides },
    bracketPairColorization: { enabled: settings.bracketPairColorization },
    autoClosingBrackets: settings.autoClosingBrackets,
    autoClosingQuotes: settings.autoClosingQuotes,
    autoSurround: settings.autoSurround,
    matchBrackets: settings.matchBrackets,
    formatOnPaste: settings.formatOnPaste,
    formatOnType: settings.formatOnType,
  };
}

let current: EditorSettings = DEFAULT_SETTINGS.editor;
const listeners = new Set<() => void>();

/** Publish the current editor settings. */
export function setEditorSettings(settings: EditorSettings): void {
  current = settings;
  for (const listener of listeners) listener();
}

/** The current editor settings. */
export function getEditorSettings(): EditorSettings {
  return current;
}

/** Subscribe to editor-settings changes. Returns an unsubscribe function. */
export function subscribeEditorSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
