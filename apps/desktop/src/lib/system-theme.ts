/**
 * Chooses a bundled theme to match the OS light/dark preference when Follow System
 * Theme is on. Pure, so the mapping is unit tested; App wires it to a matchMedia
 * listener.
 */
export const SYSTEM_DARK_THEME = 'cozy-dark';
export const SYSTEM_LIGHT_THEME = 'cozy-light';

export function themeForSystem(
  prefersDark: boolean,
  darkTheme: string = SYSTEM_DARK_THEME,
  lightTheme: string = SYSTEM_LIGHT_THEME,
): string {
  return prefersDark ? darkTheme : lightTheme;
}
