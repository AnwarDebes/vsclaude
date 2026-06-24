import { describe, expect, it } from 'vitest';
import { monacoBaseTheme } from '../lib/monaco-base-theme';

describe('monacoBaseTheme', () => {
  it('maps a dark theme to vs-dark and a light theme to vs', () => {
    expect(monacoBaseTheme({ appearance: 'dark' })).toBe('vs-dark');
    expect(monacoBaseTheme({ appearance: 'light' })).toBe('vs');
  });

  it('maps any high-contrast theme to hc-black, regardless of appearance', () => {
    expect(monacoBaseTheme({ appearance: 'dark', highContrast: true })).toBe('hc-black');
    expect(monacoBaseTheme({ appearance: 'light', highContrast: true })).toBe('hc-black');
  });
});
