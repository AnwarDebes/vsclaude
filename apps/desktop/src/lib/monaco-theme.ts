/**
 * Binds the Monaco editor theme to the app theme. The editor and the diff view no
 * longer hardcode a theme; they read the current Monaco theme name from this
 * store. A Monaco theme is defined for every bundled app theme at module load
 * (using the design tokens, which are hex), so the editor never references an
 * undefined theme, and App switches between them whenever the settings change.
 */
import { useSyncExternalStore } from 'react';
import { DEFAULT_SETTINGS, type AppSettings, type Theme } from '@vsclaude/contracts';
import { bundledThemeIds, resolveThemeById, resolveThemeForSettings } from '@vsclaude/design-system';
import { monaco } from './monaco-setup';
import { monacoBaseTheme } from './monaco-base-theme';

function themeName(id: string): string {
  return `vsclaude-${id}`;
}

function defineMonacoTheme(theme: Theme): void {
  const c = theme.color;
  monaco.editor.defineTheme(themeName(theme.id), {
    base: monacoBaseTheme(theme),
    inherit: true,
    rules: [],
    colors: {
      'editor.background': c.surface,
      'editor.foreground': c.text,
      'editorLineNumber.foreground': c.textMuted,
      'editorLineNumber.activeForeground': c.text,
      'editorCursor.foreground': c.accent,
      'editor.selectionBackground': c.accentMuted,
      'editor.lineHighlightBackground': c.surfaceElevated,
      'editorWidget.background': c.surfaceElevated,
      'editorWidget.border': c.border,
    },
  });
}

for (const id of bundledThemeIds()) {
  const theme = resolveThemeById(id);
  if (theme) defineMonacoTheme(theme);
}

let current = themeName(DEFAULT_SETTINGS.themeId);
const listeners = new Set<() => void>();

export function getMonacoTheme(): string {
  return current;
}

export function subscribeMonacoTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** React hook for the current Monaco theme name. */
export function useMonacoTheme(): string {
  return useSyncExternalStore(subscribeMonacoTheme, getMonacoTheme, getMonacoTheme);
}

/** Resolve the app theme, switch Monaco to it, and notify subscribers. */
export function applyMonacoTheme(settings: AppSettings): void {
  const resolved = resolveThemeForSettings(settings.themeId, {
    reducedMotion: settings.reducedMotion,
    colorBlindSafe: settings.colorBlindSafe,
  });
  // Always one of the bundled themes defined above; define again defensively.
  defineMonacoTheme(resolved);
  const name = themeName(resolved.id);
  monaco.editor.setTheme(name);
  if (name !== current) {
    current = name;
    for (const listener of listeners) listener();
  }
}
