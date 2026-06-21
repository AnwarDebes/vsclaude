/**
 * Theme resolution: turn a desired theme id plus accessibility preferences into
 * the concrete {@link Theme} that should actually be applied.
 *
 * The rules favour user safety: a request for a color-blind-safe palette or for
 * high contrast (reduced motion paired with the absence of a usable requested
 * theme) is honoured even when the literal requested id exists.
 */
import type { Theme } from '@vsclaude/contracts';
import {
  THEMES,
  darkTheme,
  highContrastTheme,
  colorBlindSafeTheme,
  DEFAULT_THEME_ID,
} from '@vsclaude/contracts';
import { ThemeRegistry } from './theme-registry.js';

/** Accessibility preferences that influence theme selection. */
export interface ThemeAccessibilityPrefs {
  /** When true, prefer reduced-motion friendly, higher-contrast surfaces. */
  reducedMotion?: boolean;
  /** When true, force a palette that is safe for common color vision deficiencies. */
  colorBlindSafe?: boolean;
}

/** A shared default registry seeded from the bundled contracts themes. */
const sharedRegistry = new ThemeRegistry();

/**
 * Pick the {@link Theme} that best matches a requested id under the given
 * accessibility preferences.
 *
 * Resolution order:
 * 1. If `colorBlindSafe` is set, return the color-blind-safe theme.
 * 2. Otherwise resolve the requested id from the registry.
 * 3. If the id is unknown, fall back to the default theme.
 * 4. If `reducedMotion` is set and the resolved theme is not already high
 *    contrast, prefer the high-contrast theme, which carries calmer motion.
 *
 * A caller may pass a custom registry to resolve against a different set of
 * registered themes (for example one that includes plugin contributions).
 */
export function resolveThemeForSettings(
  themeId: string | undefined,
  prefs: ThemeAccessibilityPrefs = {},
  registry: ThemeRegistry = sharedRegistry,
): Theme {
  if (prefs.colorBlindSafe) {
    return registry.get(colorBlindSafeTheme.id) ?? colorBlindSafeTheme;
  }

  const requested = themeId ? registry.get(themeId) : undefined;
  let resolved = requested ?? registry.get(DEFAULT_THEME_ID) ?? registry.getDefault();

  if (prefs.reducedMotion && resolved.id !== highContrastTheme.id) {
    resolved = registry.get(highContrastTheme.id) ?? highContrastTheme;
  }

  return resolved;
}

/**
 * Resolve a theme id to a concrete theme without applying any accessibility
 * overrides. Useful for previews where the literal selection matters.
 */
export function resolveThemeById(
  themeId: string | undefined,
  registry: ThemeRegistry = sharedRegistry,
): Theme {
  if (themeId) {
    const found = registry.get(themeId);
    if (found) {
      return found;
    }
  }
  return registry.get(DEFAULT_THEME_ID) ?? registry.getDefault();
}

/**
 * The ids of every bundled theme, in registry order. Handy for building a theme
 * picker without exposing the registry instance.
 */
export function bundledThemeIds(): string[] {
  return Object.values(THEMES).map((theme) => theme.id);
}

/** Re-export the canonical dark theme id helper for callers that need a known good fallback. */
export function safeFallbackTheme(): Theme {
  return darkTheme;
}
