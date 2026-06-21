import { describe, it, expect } from 'vitest';
import {
  THEMES,
  darkTheme,
  highContrastTheme,
  colorBlindSafeTheme,
  DEFAULT_THEME_ID,
} from '@vsclaude/contracts';
import {
  themeToCssVariables,
  themeToCssText,
  tokenKeyToCssFragment,
  ThemeRegistry,
  resolveThemeForSettings,
  resolveThemeById,
  bundledThemeIds,
} from '../index.js';

describe('css-variables', () => {
  it('emits an --color-accent custom property for the dark theme', () => {
    const vars = themeToCssVariables(darkTheme);
    expect(vars).toHaveProperty('--color-accent');
    expect(typeof vars['--color-accent']).toBe('string');
    expect((vars['--color-accent'] ?? '').length).toBeGreaterThan(0);
  });

  it('includes shared space, radius, font, motion, and z-index variables', () => {
    const vars = themeToCssVariables(darkTheme);
    const names = Object.keys(vars);
    expect(names.some((n) => n.startsWith('--space-'))).toBe(true);
    expect(names.some((n) => n.startsWith('--radius-'))).toBe(true);
    expect(names.some((n) => n.startsWith('--font-'))).toBe(true);
    expect(names.some((n) => n.startsWith('--motion-'))).toBe(true);
    expect(names.some((n) => n.startsWith('--z-'))).toBe(true);
  });

  it('renders deterministic, sorted :root css text', () => {
    const text = themeToCssText(darkTheme);
    expect(text.startsWith(':root {')).toBe(true);
    expect(text.trimEnd().endsWith('}')).toBe(true);
    expect(text).toContain('--color-accent:');
    // Sorted: the first declaration line should be lexicographically smallest.
    const declarations = text
      .split('\n')
      .slice(1, -1)
      .map((line) => line.trim().split(':')[0] ?? '');
    const sorted = [...declarations].sort();
    expect(declarations).toEqual(sorted);
  });

  it('converts camelCase token keys to kebab-case fragments', () => {
    expect(tokenKeyToCssFragment('accent')).toBe('accent');
    expect(tokenKeyToCssFragment('editorBackground')).toBe('editor-background');
  });

  it('supports a custom selector for scoped variables', () => {
    const text = themeToCssText(darkTheme, '[data-theme="dark"]');
    expect(text.startsWith('[data-theme="dark"] {')).toBe(true);
  });
});

describe('ThemeRegistry', () => {
  it('lists all bundled themes by default', () => {
    const registry = new ThemeRegistry();
    expect(registry.size).toBe(Object.keys(THEMES).length);
    const ids = registry.ids();
    for (const theme of Object.values(THEMES)) {
      expect(ids).toContain(theme.id);
    }
  });

  it('puts the default theme first in the listing', () => {
    const registry = new ThemeRegistry();
    const first = registry.list()[0];
    expect(first?.id).toBe(DEFAULT_THEME_ID);
    expect(registry.getDefault().id).toBe(DEFAULT_THEME_ID);
  });

  it('registers and retrieves new themes, and reports membership', () => {
    const registry = new ThemeRegistry({ seed: false });
    expect(registry.size).toBe(0);
    registry.register(darkTheme);
    expect(registry.has(darkTheme.id)).toBe(true);
    expect(registry.get(darkTheme.id)?.id).toBe(darkTheme.id);
    expect(registry.size).toBe(1);
  });

  it('throws when setting a default that is not registered', () => {
    const registry = new ThemeRegistry({ seed: false });
    expect(() => registry.setDefault('does-not-exist')).toThrow();
  });

  it('throws getDefault when completely empty', () => {
    const registry = new ThemeRegistry({ seed: false });
    expect(() => registry.getDefault()).toThrow();
  });
});

describe('resolveThemeForSettings', () => {
  it('honours colorBlindSafe above everything else', () => {
    const resolved = resolveThemeForSettings(darkTheme.id, {
      colorBlindSafe: true,
    });
    expect(resolved.id).toBe(colorBlindSafeTheme.id);
  });

  it('upgrades to high contrast when reducedMotion is requested', () => {
    const resolved = resolveThemeForSettings(darkTheme.id, {
      reducedMotion: true,
    });
    expect(resolved.id).toBe(highContrastTheme.id);
  });

  it('falls back to the default theme for an unknown id', () => {
    const resolved = resolveThemeForSettings('totally-unknown-theme', {});
    expect(resolved.id).toBe(DEFAULT_THEME_ID);
  });

  it('returns the literal requested theme via resolveThemeById without overrides', () => {
    const resolved = resolveThemeById(darkTheme.id);
    expect(resolved.id).toBe(darkTheme.id);
  });

  it('exposes the bundled theme ids', () => {
    expect(bundledThemeIds()).toEqual(Object.values(THEMES).map((t) => t.id));
  });
});
