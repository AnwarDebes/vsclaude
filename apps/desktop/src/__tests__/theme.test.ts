import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@vsclaude/contracts';
import { currentTheme, exportTheme } from '../lib/theme';

describe('theme export', () => {
  it('resolves a theme with an id', () => {
    expect(currentTheme(DEFAULT_SETTINGS).id.length).toBeGreaterThan(0);
  });

  it('exports the active theme as JSON carrying its id', () => {
    const parsed = JSON.parse(exportTheme(DEFAULT_SETTINGS));
    expect(parsed.id).toBe(currentTheme(DEFAULT_SETTINGS).id);
  });
});
