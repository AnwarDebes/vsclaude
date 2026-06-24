/**
 * Chooses a bundled theme to match the OS light/dark preference when Follow System
 * Theme is on. Pure, so the mapping is unit tested; App wires it to a matchMedia
 * listener.
 */
export const SYSTEM_DARK_THEME = 'cozy-dark';
export const SYSTEM_LIGHT_THEME = 'cozy-light';

export function themeForSystem(prefersDark: boolean): string {
  return prefersDark ? SYSTEM_DARK_THEME : SYSTEM_LIGHT_THEME;
}
