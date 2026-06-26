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
      fontFamily: "'JetBrains Mono', 'Cascadia Code', ui-monospace, monospace",
      fontLigatures: true,
      tabSize: 2,
      insertSpaces: true,
      detectIndentation: true,
      wordWrap: 'off',
      wordWrapColumn: 80,
      wrappingIndent: 'same',
      wordBasedSuggestions: 'matchingDocuments',
      columnSelection: false,
      occurrencesHighlight: 'singleFile',
      dragAndDrop: true,
      emptySelectionClipboard: true,
      multiCursorPaste: 'spread',
      minimap: { enabled: true, side: 'right', size: 'proportional' },
      lineNumbers: 'on',
      rulers: [],
      renderWhitespace: 'selection',
      renderControlCharacters: true,
      renderFinalNewline: 'on',
      cursorStyle: 'line',
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'off',
      cursorSurroundingLines: 0,
      lineHeight: 0,
      fontWeight: 'normal',
      mouseWheelZoom: false,
      smoothScrolling: true,
      fastScrollSensitivity: 5,
      scrollBeyondLastLine: false,
      folding: true,
      stickyScroll: { enabled: true },
      guides: { bracketPairs: true, indentation: true },
      bracketPairColorization: { enabled: true },
      autoClosingBrackets: 'languageDefined',
      autoClosingQuotes: 'languageDefined',
      autoSurround: 'languageDefined',
      matchBrackets: 'always',
      formatOnPaste: false,
      formatOnType: false,
    });
  });

  it('maps the drag-drop, empty-selection-clipboard, and multi-cursor-paste settings', () => {
    const mapped = editorSettingsToMonaco({
      ...DEFAULT_SETTINGS.editor,
      dragAndDrop: false,
      emptySelectionClipboard: false,
      multiCursorPaste: 'full',
    });
    expect(mapped.dragAndDrop).toBe(false);
    expect(mapped.emptySelectionClipboard).toBe(false);
    expect(mapped.multiCursorPaste).toBe('full');
  });

  it('maps the occurrences-highlight scope through to Monaco', () => {
    const mapped = editorSettingsToMonaco({ ...DEFAULT_SETTINGS.editor, occurrencesHighlight: 'multiFile' });
    expect(mapped.occurrencesHighlight).toBe('multiFile');
  });

  it('maps the column-selection toggle through to Monaco', () => {
    const mapped = editorSettingsToMonaco({ ...DEFAULT_SETTINGS.editor, columnSelection: true });
    expect(mapped.columnSelection).toBe(true);
  });

  it('maps the word-based-suggestions scope through to Monaco', () => {
    const mapped = editorSettingsToMonaco({
      ...DEFAULT_SETTINGS.editor,
      wordBasedSuggestions: 'allDocuments',
    });
    expect(mapped.wordBasedSuggestions).toBe('allDocuments');
  });

  it('maps the control-character and final-newline rendering toggles off', () => {
    const mapped = editorSettingsToMonaco({
      ...DEFAULT_SETTINGS.editor,
      renderControlCharacters: false,
      renderFinalNewline: false,
    });
    expect(mapped.renderControlCharacters).toBe(false);
    expect(mapped.renderFinalNewline).toBe('off');
  });

  it('maps the format-on-paste and format-on-type toggles', () => {
    const mapped = editorSettingsToMonaco({
      ...DEFAULT_SETTINGS.editor,
      formatOnPaste: true,
      formatOnType: true,
    });
    expect(mapped.formatOnPaste).toBe(true);
    expect(mapped.formatOnType).toBe(true);
  });

  it('maps folding and sticky scroll', () => {
    const mapped = editorSettingsToMonaco({
      ...DEFAULT_SETTINGS.editor,
      folding: false,
      stickyScroll: false,
    });
    expect(mapped.folding).toBe(false);
    expect(mapped.stickyScroll).toEqual({ enabled: false });
  });

  it('maps the indentation settings', () => {
    const mapped = editorSettingsToMonaco({
      ...DEFAULT_SETTINGS.editor,
      detectIndentation: false,
      indentGuides: false,
    });
    expect(mapped.detectIndentation).toBe(false);
    expect(mapped.guides).toEqual({ bracketPairs: true, indentation: false });
  });

  it('maps the cursor and scrolling settings', () => {
    const mapped = editorSettingsToMonaco({
      ...DEFAULT_SETTINGS.editor,
      cursorBlinking: 'phase',
      cursorSmoothCaretAnimation: 'on',
      cursorSurroundingLines: 3,
      smoothScrolling: false,
      fastScrollSensitivity: 8,
      scrollBeyondLastLine: true,
    });
    expect(mapped.cursorBlinking).toBe('phase');
    expect(mapped.cursorSmoothCaretAnimation).toBe('on');
    expect(mapped.cursorSurroundingLines).toBe(3);
    expect(mapped.smoothScrolling).toBe(false);
    expect(mapped.fastScrollSensitivity).toBe(8);
    expect(mapped.scrollBeyondLastLine).toBe(true);
  });

  it('maps the bracket and auto-close settings', () => {
    const mapped = editorSettingsToMonaco({
      ...DEFAULT_SETTINGS.editor,
      bracketPairColorization: false,
      autoClosingBrackets: 'never',
      autoClosingQuotes: 'beforeWhitespace',
      autoSurround: 'quotes',
      matchBrackets: 'near',
    });
    expect(mapped.bracketPairColorization).toEqual({ enabled: false });
    expect(mapped.autoClosingBrackets).toBe('never');
    expect(mapped.autoClosingQuotes).toBe('beforeWhitespace');
    expect(mapped.autoSurround).toBe('quotes');
    expect(mapped.matchBrackets).toBe('near');
  });

  it('maps a ruler column to a Monaco rulers array', () => {
    expect(editorSettingsToMonaco({ ...DEFAULT_SETTINGS.editor, rulers: 80 }).rulers).toEqual([80]);
    expect(editorSettingsToMonaco({ ...DEFAULT_SETTINGS.editor, rulers: 0 }).rulers).toEqual([]);
  });

  it('maps the word-wrap mode, column, and wrapping indent to Monaco', () => {
    const mapped = editorSettingsToMonaco({
      ...DEFAULT_SETTINGS.editor,
      wordWrap: 'bounded',
      wordWrapColumn: 120,
      wrappingIndent: 'indent',
    });
    expect(mapped.wordWrap).toBe('bounded');
    expect(mapped.wordWrapColumn).toBe(120);
    expect(mapped.wrappingIndent).toBe('indent');
  });

  it('maps the minimap boolean to a Monaco shape', () => {
    const mapped = editorSettingsToMonaco({ ...DEFAULT_SETTINGS.editor, minimap: false });
    expect(mapped.minimap).toEqual({ enabled: false, side: 'right', size: 'proportional' });
  });

  it('maps the minimap side and size', () => {
    const mapped = editorSettingsToMonaco({
      ...DEFAULT_SETTINGS.editor,
      minimapSide: 'left',
      minimapSize: 'fit',
    });
    expect(mapped.minimap).toEqual({ enabled: true, side: 'left', size: 'fit' });
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

  it('exposes the diff editor settings', () => {
    const diffIds = filterSettings('diff', SETTINGS_SCHEMA).map((d) => d.id);
    expect(diffIds).toContain('editor.diffAlgorithm');
    expect(diffIds).toContain('editor.diffMaxComputationTime');
  });

  it('exposes the editor font settings', () => {
    const fontIds = filterSettings('font', SETTINGS_SCHEMA).map((d) => d.id);
    expect(fontIds).toContain('editor.fontFamily');
    expect(fontIds).toContain('editor.fontLigatures');
  });

  it('exposes the bracket and auto-close settings', () => {
    const ids = SETTINGS_SCHEMA.map((d) => d.id);
    expect(ids).toContain('editor.bracketPairColorization');
    expect(ids).toContain('editor.autoClosingBrackets');
    expect(ids).toContain('editor.autoClosingQuotes');
    expect(ids).toContain('editor.autoSurround');
    expect(ids).toContain('editor.matchBrackets');
  });

  it('exposes the indentation settings', () => {
    const ids = SETTINGS_SCHEMA.map((d) => d.id);
    expect(ids).toContain('editor.detectIndentation');
    expect(ids).toContain('editor.indentGuides');
  });

  it('exposes folding and sticky scroll', () => {
    const ids = SETTINGS_SCHEMA.map((d) => d.id);
    expect(ids).toContain('editor.folding');
    expect(ids).toContain('editor.stickyScroll');
  });

  it('exposes the cursor and scrolling settings', () => {
    const ids = SETTINGS_SCHEMA.map((d) => d.id);
    expect(ids).toContain('editor.cursorBlinking');
    expect(ids).toContain('editor.cursorSmoothCaretAnimation');
    expect(ids).toContain('editor.cursorSurroundingLines');
    expect(ids).toContain('editor.smoothScrolling');
    expect(ids).toContain('editor.fastScrollSensitivity');
    expect(ids).toContain('editor.scrollBeyondLastLine');
  });
});
