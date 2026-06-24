/**
 * Pure mapping from an app theme to a Monaco base theme. Kept in its own module
 * (no Monaco import) so it is unit testable; monaco-theme.ts builds on it.
 */
export type MonacoBaseTheme = 'vs' | 'vs-dark' | 'hc-black';

/** The Monaco base theme for an app theme: high-contrast, light, or dark. */
export function monacoBaseTheme(theme: {
  appearance: 'light' | 'dark';
  highContrast?: boolean;
}): MonacoBaseTheme {
  if (theme.highContrast) return 'hc-black';
  return theme.appearance === 'light' ? 'vs' : 'vs-dark';
}
