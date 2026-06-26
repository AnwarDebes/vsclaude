import { describe, expect, it } from 'vitest';
import { SYSTEM_DARK_THEME, SYSTEM_LIGHT_THEME, themeForSystem } from '../lib/system-theme';

describe('themeForSystem', () => {
  it('picks the dark theme when the OS prefers dark', () => {
    expect(themeForSystem(true)).toBe(SYSTEM_DARK_THEME);
  });

  it('picks the light theme otherwise', () => {
    expect(themeForSystem(false)).toBe(SYSTEM_LIGHT_THEME);
  });

  it('uses the supplied preferred themes when given', () => {
    expect(themeForSystem(true, 'high-contrast', 'cozy-light')).toBe('high-contrast');
    expect(themeForSystem(false, 'high-contrast', 'cozy-cb-safe')).toBe('cozy-cb-safe');
  });

  it('falls back to the bundled defaults when preferences are omitted', () => {
    expect(themeForSystem(true)).toBe(SYSTEM_DARK_THEME);
    expect(themeForSystem(false)).toBe(SYSTEM_LIGHT_THEME);
  });
});
