/**
 * A small store for the live editor settings, so the Monaco editor and the diff
 * view can read them without prop drilling through the workspace tree. App writes
 * the current settings here whenever they change; the editor subscribes.
 */
import { DEFAULT_SETTINGS, type EditorSettings } from '@vsclaude/contracts';

/** Monaco construction options derived from the editor settings. */
export interface MonacoEditorOptions {
  fontSize: number;
  tabSize: number;
  insertSpaces: boolean;
  wordWrap: 'on' | 'off';
  minimap: { enabled: boolean; side: 'left' | 'right'; size: 'proportional' | 'fill' | 'fit' };
  lineNumbers: 'on' | 'off' | 'relative';
  rulers: number[];
  renderWhitespace: 'none' | 'selection' | 'all';
  cursorStyle: 'line' | 'block' | 'underline';
  lineHeight: number;
  fontWeight: string;
  mouseWheelZoom: boolean;
  guides: { bracketPairs: boolean };
}

/** Map the editor settings to Monaco's option names. */
export function editorSettingsToMonaco(settings: EditorSettings): MonacoEditorOptions {
  return {
    fontSize: settings.fontSize,
    tabSize: settings.tabSize,
    insertSpaces: settings.insertSpaces,
    wordWrap: settings.wordWrap ? 'on' : 'off',
    minimap: { enabled: settings.minimap, side: settings.minimapSide, size: settings.minimapSize },
    lineNumbers: settings.lineNumbers,
    rulers: settings.rulers > 0 ? [settings.rulers] : [],
    renderWhitespace: settings.renderWhitespace,
    cursorStyle: settings.cursorStyle,
    lineHeight: settings.lineHeight,
    fontWeight: settings.fontWeight,
    mouseWheelZoom: settings.mouseWheelZoom,
    guides: { bracketPairs: settings.bracketPairGuides },
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
