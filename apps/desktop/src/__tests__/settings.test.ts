import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@vsclaude/contracts';
import {
  editorSettingsToMonaco,
  getEditorSettings,
  setEditorSettings,
  subscribeEditorSettings,
} from '../lib/editor-settings';
import {
  defaultSettingValue,
  filterSettings,
  isSettingDefault,
  SETTINGS_SCHEMA,
} from '../lib/settings-schema';

describe('editorSettingsToMonaco', () => {
  it('maps the defaults to Monaco option names', () => {
    expect(editorSettingsToMonaco(DEFAULT_SETTINGS.editor)).toEqual({
      fontSize: 13,
      tabSize: 2,
      insertSpaces: true,
      wordWrap: 'off',
      minimap: { enabled: true },
      lineNumbers: 'on',
      rulers: [],
      renderWhitespace: 'selection',
      cursorStyle: 'line',
      lineHeight: 0,
      fontWeight: 'normal',
      mouseWheelZoom: false,
      guides: { bracketPairs: true },
    });
  });

  it('maps a ruler column to a Monaco rulers array', () => {
    expect(editorSettingsToMonaco({ ...DEFAULT_SETTINGS.editor, rulers: 80 }).rulers).toEqual([80]);
    expect(editorSettingsToMonaco({ ...DEFAULT_SETTINGS.editor, rulers: 0 }).rulers).toEqual([]);
  });

  it('maps word wrap and minimap booleans to Monaco shapes', () => {
    const mapped = editorSettingsToMonaco({
      ...DEFAULT_SETTINGS.editor,
      wordWrap: true,
      minimap: false,
    });
    expect(mapped.wordWrap).toBe('on');
    expect(mapped.minimap).toEqual({ enabled: false });
  });
});

describe('editor settings store', () => {
  afterEach(() => setEditorSettings(DEFAULT_SETTINGS.editor));

  it('publishes and reads the current settings, notifying subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeEditorSettings(listener);
    setEditorSettings({ ...DEFAULT_SETTINGS.editor, fontSize: 18 });
    expect(getEditorSettings().fontSize).toBe(18);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setEditorSettings({ ...DEFAULT_SETTINGS.editor, fontSize: 20 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('settings schema', () => {
  it('has a unique id for every setting', () => {
    const ids = SETTINGS_SCHEMA.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reports every setting as default for DEFAULT_SETTINGS', () => {
    for (const def of SETTINGS_SCHEMA) {
      expect(isSettingDefault(def, DEFAULT_SETTINGS)).toBe(true);
      expect(def.get(DEFAULT_SETTINGS)).toBe(defaultSettingValue(def));
    }
  });

  it('set then get round-trips and marks the setting modified', () => {
    const fontSize = SETTINGS_SCHEMA.find((d) => d.id === 'editor.fontSize')!;
    const next = fontSize.set(DEFAULT_SETTINGS, 22);
    expect(fontSize.get(next)).toBe(22);
    expect(isSettingDefault(fontSize, next)).toBe(false);
    // Other settings are untouched.
    expect(next.editor.tabSize).toBe(DEFAULT_SETTINGS.editor.tabSize);
  });
});

describe('filterSettings', () => {
  it('returns the whole schema for an empty query', () => {
    expect(filterSettings('', SETTINGS_SCHEMA)).toHaveLength(SETTINGS_SCHEMA.length);
  });

  it('matches on label, description, category, and id', () => {
    expect(filterSettings('font', SETTINGS_SCHEMA).map((d) => d.id)).toContain('editor.fontSize');
    expect(filterSettings('minimap', SETTINGS_SCHEMA).map((d) => d.id)).toContain('editor.minimap');
    expect(filterSettings('appearance', SETTINGS_SCHEMA).every((d) => d.category === 'Appearance')).toBe(true);
  });

  it('returns nothing when no setting matches', () => {
    expect(filterSettings('zzzznope', SETTINGS_SCHEMA)).toHaveLength(0);
  });
});
