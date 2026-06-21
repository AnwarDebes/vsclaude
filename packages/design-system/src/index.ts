/**
 * @vsclaude/design-system
 *
 * The initial logic layer of the vsclaude design system. It converts the typed
 * design tokens from `@vsclaude/contracts` into CSS custom properties, provides
 * a small theme registry, and resolves the correct theme for a given set of
 * user accessibility preferences.
 *
 * This package is pure TypeScript with no UI dependencies. React and native
 * integrations are tracked in ROADMAP.md and arrive in a later layer.
 */

export {
  themeToCssVariables,
  themeToCssText,
  tokenKeyToCssFragment,
} from './css-variables.js';

export { ThemeRegistry } from './theme-registry.js';

export {
  resolveThemeForSettings,
  resolveThemeById,
  bundledThemeIds,
  safeFallbackTheme,
} from './resolve-theme.js';

export type { ThemeAccessibilityPrefs } from './resolve-theme.js';
