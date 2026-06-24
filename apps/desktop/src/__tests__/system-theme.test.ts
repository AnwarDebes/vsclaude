import { describe, expect, it } from 'vitest';
import { SYSTEM_DARK_THEME, SYSTEM_LIGHT_THEME, themeForSystem } from '../lib/system-theme';

describe('themeForSystem', () => {
  it('picks the dark theme when the OS prefers dark', () => {
    expect(themeForSystem(true)).toBe(SYSTEM_DARK_THEME);
  });

  it('picks the light theme otherwise', () => {
    expect(themeForSystem(false)).toBe(SYSTEM_LIGHT_THEME);
  });
});
