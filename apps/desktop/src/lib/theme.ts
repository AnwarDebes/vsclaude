/**
 * Runtime theming and settings persistence for the web renderer.
 *
 * Themes are resolved and turned into CSS variables by `@vsclaude/design-system`
 * from the frozen tokens, and applied to the document root. Settings are merged
 * over the contract defaults by `@vsclaude/persistence` and stored in
 * localStorage. In the native app these settings live in the OS-backed store.
 */
import { DEFAULT_SETTINGS, type AppSettings, type Theme } from '@vsclaude/contracts';
import { resolveThemeForSettings, themeToCssVariables } from '@vsclaude/design-system';
import { mergeSettings } from '@vsclaude/persistence';

const STORAGE_KEY = 'vsclaude.settings';

/** Load settings from localStorage, merged over the contract defaults. */
export function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return mergeSettings(JSON.parse(raw) as Parameters<typeof mergeSettings>[0]);
    }
  } catch {
    // Corrupt or unavailable storage: fall back to defaults.
  }
  return DEFAULT_SETTINGS;
}

/** Persist settings to localStorage. */
export function saveAppSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage may be unavailable (private mode); applying still works in memory.
  }
}

/** The theme that the settings resolve to, after accessibility overrides. */
export function currentTheme(settings: AppSettings): Theme {
  return resolveThemeForSettings(settings.themeId, {
    reducedMotion: settings.reducedMotion,
    colorBlindSafe: settings.colorBlindSafe,
  });
}

/** The active theme serialized as JSON, for export. */
export function exportTheme(settings: AppSettings): string {
  return JSON.stringify(currentTheme(settings), null, 2);
}

/** Resolve the active theme and apply its variables to the document root. */
export function applyTheme(settings: AppSettings): void {
  const theme = currentTheme(settings);
  const root = document.documentElement;
  for (const [name, value] of Object.entries(themeToCssVariables(theme))) {
    root.style.setProperty(name, value);
  }
  root.dataset.reducedMotion = settings.reducedMotion ? 'true' : 'false';
  root.dataset.theme = theme.id;
}
