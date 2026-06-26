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
  // An imported custom theme takes over while themeId is the "custom" sentinel.
  if (settings.themeId === 'custom' && settings.customTheme) {
    return settings.customTheme;
  }
  return resolveThemeForSettings(settings.themeId, {
    reducedMotion: settings.reducedMotion,
    colorBlindSafe: settings.colorBlindSafe,
  });
}

/**
 * Parse a pasted theme JSON (as produced by exportTheme) into a Theme, or null when
 * it is not valid JSON or is missing the required shape. Pure, so it is unit tested.
 */
export function parseImportedTheme(json: string): Theme | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const candidate = parsed as Record<string, unknown>;
  if (typeof candidate.id !== 'string' || candidate.id.length === 0) return null;
  if (typeof candidate.name !== 'string') return null;
  if (candidate.appearance !== 'light' && candidate.appearance !== 'dark') return null;
  if (!candidate.color || typeof candidate.color !== 'object') return null;
  // Require every color token the app consumes, so a partial or wrong-shaped paste is
  // rejected (with the modal's error) instead of importing as a silent no-op. The key
  // list is derived from the default theme, so it tracks ColorTokens automatically.
  const color = candidate.color as Record<string, unknown>;
  for (const key of Object.keys(currentTheme(DEFAULT_SETTINGS).color)) {
    if (typeof color[key] !== 'string') return null;
  }
  return parsed as Theme;
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
