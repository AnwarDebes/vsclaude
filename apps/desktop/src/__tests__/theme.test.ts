import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@vsclaude/contracts';
import { currentTheme, exportTheme, parseImportedTheme } from '../lib/theme';

describe('theme export', () => {
  it('resolves a theme with an id', () => {
    expect(currentTheme(DEFAULT_SETTINGS).id.length).toBeGreaterThan(0);
  });

  it('exports the active theme as JSON carrying its id', () => {
    const parsed = JSON.parse(exportTheme(DEFAULT_SETTINGS));
    expect(parsed.id).toBe(currentTheme(DEFAULT_SETTINGS).id);
  });
});

describe('parseImportedTheme', () => {
  // A complete, valid theme: the default theme's full color set under a new id.
  const validJson = JSON.stringify({
    id: 'x',
    name: 'X',
    appearance: 'dark',
    color: currentTheme(DEFAULT_SETTINGS).color,
  });

  it('rejects invalid JSON and the wrong shape', () => {
    expect(parseImportedTheme('not json')).toBeNull();
    expect(parseImportedTheme('123')).toBeNull();
    expect(parseImportedTheme('{}')).toBeNull();
    expect(parseImportedTheme('{"id":"x","name":"X","appearance":"dark"}')).toBeNull();
    expect(parseImportedTheme('{"id":"x","name":"X","appearance":"sideways","color":{}}')).toBeNull();
  });

  it('rejects a color object missing required tokens (silent no-op trap)', () => {
    expect(parseImportedTheme('{"id":"x","name":"X","appearance":"dark","color":{}}')).toBeNull();
    expect(parseImportedTheme('{"id":"x","name":"X","appearance":"dark","color":{"bg":"#000"}}')).toBeNull();
  });

  it('accepts a well-formed theme with the full color set', () => {
    const theme = parseImportedTheme(validJson);
    expect(theme?.id).toBe('x');
    expect(theme?.appearance).toBe('dark');
  });

  it('round-trips an exported theme', () => {
    const theme = parseImportedTheme(exportTheme(DEFAULT_SETTINGS));
    expect(theme?.id).toBe(currentTheme(DEFAULT_SETTINGS).id);
  });
});

describe('custom theme override', () => {
  it('uses the imported custom theme while themeId is "custom"', () => {
    const imported = parseImportedTheme(exportTheme(DEFAULT_SETTINGS))!;
    const tagged = { ...imported, id: 'my-custom' };
    const settings = { ...DEFAULT_SETTINGS, themeId: 'custom', customTheme: tagged };
    expect(currentTheme(settings).id).toBe('my-custom');
  });

  it('ignores the custom theme once a real themeId is selected', () => {
    const imported = parseImportedTheme(exportTheme(DEFAULT_SETTINGS))!;
    const settings = { ...DEFAULT_SETTINGS, themeId: 'cozy-dark', customTheme: imported };
    expect(currentTheme(settings).id).not.toBe('custom');
  });
});
