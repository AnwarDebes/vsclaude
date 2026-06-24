import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@vsclaude/contracts';
import { loadSettings, serializeSettings } from '@vsclaude/persistence';

describe('settings JSON round-trip', () => {
  it('serializes and reloads to an equal object', () => {
    const next = { ...DEFAULT_SETTINGS, themeId: 'cozy-light' };
    expect(loadSettings(serializeSettings(next))).toEqual(next);
  });

  it('merges a partial document over the defaults', () => {
    const loaded = loadSettings('{"themeId":"custom"}');
    expect(loaded.themeId).toBe('custom');
    expect(loaded.presentationMode).toBe(DEFAULT_SETTINGS.presentationMode);
  });

  it('falls back to defaults on invalid JSON', () => {
    expect(loadSettings('{ not json')).toEqual(DEFAULT_SETTINGS);
  });
});
