/**
 * The settings schema: a data description of every user-facing setting, its
 * control, and how to read and write it on AppSettings. The Settings panel renders
 * from this list, so adding a setting is a one-line data change, and the search,
 * modified indicator, and reset all work generically.
 */
import { DEFAULT_SETTINGS, type AppSettings, type PresentationMode } from '@vsclaude/contracts';
import { bundledThemeIds } from '@vsclaude/design-system';

export type SettingValue = number | boolean | string;

export type SettingControl =
  | { kind: 'number'; min: number; max: number }
  | { kind: 'boolean' }
  | { kind: 'select'; options: { value: string; label: string }[] };

export interface SettingDef {
  readonly id: string;
  readonly category: string;
  readonly label: string;
  readonly description: string;
  readonly control: SettingControl;
  readonly get: (s: AppSettings) => SettingValue;
  readonly set: (s: AppSettings, value: SettingValue) => AppSettings;
}

const PRESENTATION_MODES: PresentationMode[] = ['companion', 'stage', 'swarm', 'minimal', 'cozy'];

export const SETTINGS_SCHEMA: readonly SettingDef[] = [
  {
    id: 'editor.fontSize',
    category: 'Editor',
    label: 'Font Size',
    description: 'The editor font size, in pixels.',
    control: { kind: 'number', min: 8, max: 32 },
    get: (s) => s.editor.fontSize,
    set: (s, v) => ({ ...s, editor: { ...s.editor, fontSize: Number(v) } }),
  },
  {
    id: 'editor.tabSize',
    category: 'Editor',
    label: 'Tab Size',
    description: 'The number of spaces a tab is equal to.',
    control: { kind: 'number', min: 1, max: 8 },
    get: (s) => s.editor.tabSize,
    set: (s, v) => ({ ...s, editor: { ...s.editor, tabSize: Number(v) } }),
  },
  {
    id: 'editor.insertSpaces',
    category: 'Editor',
    label: 'Insert Spaces',
    description: 'Insert spaces when pressing Tab.',
    control: { kind: 'boolean' },
    get: (s) => s.editor.insertSpaces,
    set: (s, v) => ({ ...s, editor: { ...s.editor, insertSpaces: Boolean(v) } }),
  },
  {
    id: 'editor.wordWrap',
    category: 'Editor',
    label: 'Word Wrap',
    description: 'Wrap long lines to fit the editor width.',
    control: { kind: 'boolean' },
    get: (s) => s.editor.wordWrap,
    set: (s, v) => ({ ...s, editor: { ...s.editor, wordWrap: Boolean(v) } }),
  },
  {
    id: 'editor.minimap',
    category: 'Editor',
    label: 'Minimap',
    description: 'Show the minimap to the right of the editor.',
    control: { kind: 'boolean' },
    get: (s) => s.editor.minimap,
    set: (s, v) => ({ ...s, editor: { ...s.editor, minimap: Boolean(v) } }),
  },
  {
    id: 'editor.minimapSide',
    category: 'Editor',
    label: 'Minimap Side',
    description: 'Which side of the editor the minimap sits on.',
    control: {
      kind: 'select',
      options: [
        { value: 'right', label: 'Right' },
        { value: 'left', label: 'Left' },
      ],
    },
    get: (s) => s.editor.minimapSide,
    set: (s, v) => ({ ...s, editor: { ...s.editor, minimapSide: v as 'left' | 'right' } }),
  },
  {
    id: 'editor.minimapSize',
    category: 'Editor',
    label: 'Minimap Size',
    description: 'How the minimap fills the vertical space.',
    control: {
      kind: 'select',
      options: [
        { value: 'proportional', label: 'Proportional' },
        { value: 'fill', label: 'Fill' },
        { value: 'fit', label: 'Fit' },
      ],
    },
    get: (s) => s.editor.minimapSize,
    set: (s, v) => ({ ...s, editor: { ...s.editor, minimapSize: v as 'proportional' | 'fill' | 'fit' } }),
  },
  {
    id: 'editor.lineNumbers',
    category: 'Editor',
    label: 'Line Numbers',
    description: 'How line numbers are rendered.',
    control: {
      kind: 'select',
      options: [
        { value: 'on', label: 'On' },
        { value: 'off', label: 'Off' },
        { value: 'relative', label: 'Relative' },
      ],
    },
    get: (s) => s.editor.lineNumbers,
    set: (s, v) => ({ ...s, editor: { ...s.editor, lineNumbers: v as 'on' | 'off' | 'relative' } }),
  },
  {
    id: 'editor.rulers',
    category: 'Editor',
    label: 'Ruler Column',
    description: 'Show a vertical ruler at this column, or 0 for none.',
    control: { kind: 'number', min: 0, max: 200 },
    get: (s) => s.editor.rulers,
    set: (s, v) => ({ ...s, editor: { ...s.editor, rulers: Number(v) } }),
  },
  {
    id: 'editor.renderWhitespace',
    category: 'Editor',
    label: 'Render Whitespace',
    description: 'When to show whitespace characters.',
    control: {
      kind: 'select',
      options: [
        { value: 'none', label: 'None' },
        { value: 'selection', label: 'Selection' },
        { value: 'all', label: 'All' },
      ],
    },
    get: (s) => s.editor.renderWhitespace,
    set: (s, v) => ({ ...s, editor: { ...s.editor, renderWhitespace: v as 'none' | 'selection' | 'all' } }),
  },
  {
    id: 'editor.cursorStyle',
    category: 'Editor',
    label: 'Cursor Style',
    description: 'The shape of the editor caret.',
    control: {
      kind: 'select',
      options: [
        { value: 'line', label: 'Line' },
        { value: 'block', label: 'Block' },
        { value: 'underline', label: 'Underline' },
      ],
    },
    get: (s) => s.editor.cursorStyle,
    set: (s, v) => ({ ...s, editor: { ...s.editor, cursorStyle: v as 'line' | 'block' | 'underline' } }),
  },
  {
    id: 'editor.lineHeight',
    category: 'Editor',
    label: 'Line Height',
    description: 'Editor line height in pixels, or 0 to derive it from the font size.',
    control: { kind: 'number', min: 0, max: 40 },
    get: (s) => s.editor.lineHeight,
    set: (s, v) => ({ ...s, editor: { ...s.editor, lineHeight: Number(v) } }),
  },
  {
    id: 'editor.fontWeight',
    category: 'Editor',
    label: 'Font Weight',
    description: 'The weight of the editor font.',
    control: {
      kind: 'select',
      options: [
        { value: 'normal', label: 'Normal' },
        { value: '500', label: 'Medium' },
        { value: '600', label: 'Semibold' },
        { value: 'bold', label: 'Bold' },
      ],
    },
    get: (s) => s.editor.fontWeight,
    set: (s, v) => ({ ...s, editor: { ...s.editor, fontWeight: v as 'normal' | '500' | '600' | 'bold' } }),
  },
  {
    id: 'editor.mouseWheelZoom',
    category: 'Editor',
    label: 'Mouse Wheel Zoom',
    description: 'Zoom the editor font with Ctrl and the mouse wheel.',
    control: { kind: 'boolean' },
    get: (s) => s.editor.mouseWheelZoom,
    set: (s, v) => ({ ...s, editor: { ...s.editor, mouseWheelZoom: Boolean(v) } }),
  },
  {
    id: 'editor.diffIgnoreTrimWhitespace',
    category: 'Editor',
    label: 'Diff Ignore Trailing Whitespace',
    description: 'Ignore trailing-whitespace-only changes in the diff editor.',
    control: { kind: 'boolean' },
    get: (s) => s.editor.diffIgnoreTrimWhitespace,
    set: (s, v) => ({ ...s, editor: { ...s.editor, diffIgnoreTrimWhitespace: Boolean(v) } }),
  },
  {
    id: 'editor.diffAlgorithm',
    category: 'Editor',
    label: 'Diff Algorithm',
    description: 'The algorithm the diff editor uses to compare files.',
    control: {
      kind: 'select',
      options: [
        { value: 'advanced', label: 'Advanced' },
        { value: 'legacy', label: 'Legacy' },
      ],
    },
    get: (s) => s.editor.diffAlgorithm,
    set: (s, v) => ({ ...s, editor: { ...s.editor, diffAlgorithm: v as 'legacy' | 'advanced' } }),
  },
  {
    id: 'editor.diffMaxComputationTime',
    category: 'Editor',
    label: 'Diff Max Computation Time',
    description: 'Cap in milliseconds on diff computation, or 0 for no cap.',
    control: { kind: 'number', min: 0, max: 10000 },
    get: (s) => s.editor.diffMaxComputationTime,
    set: (s, v) => ({ ...s, editor: { ...s.editor, diffMaxComputationTime: Number(v) } }),
  },
  {
    id: 'editor.bracketPairGuides',
    category: 'Editor',
    label: 'Bracket Pair Guides',
    description: 'Draw vertical guides for matching bracket pairs.',
    control: { kind: 'boolean' },
    get: (s) => s.editor.bracketPairGuides,
    set: (s, v) => ({ ...s, editor: { ...s.editor, bracketPairGuides: Boolean(v) } }),
  },
  {
    id: 'editor.trimTrailingWhitespace',
    category: 'Editor',
    label: 'Trim Trailing Whitespace',
    description: 'On save, strip trailing whitespace from every line.',
    control: { kind: 'boolean' },
    get: (s) => s.editor.trimTrailingWhitespace,
    set: (s, v) => ({ ...s, editor: { ...s.editor, trimTrailingWhitespace: Boolean(v) } }),
  },
  {
    id: 'editor.insertFinalNewline',
    category: 'Editor',
    label: 'Insert Final Newline',
    description: 'On save, ensure the file ends with a newline.',
    control: { kind: 'boolean' },
    get: (s) => s.editor.insertFinalNewline,
    set: (s, v) => ({ ...s, editor: { ...s.editor, insertFinalNewline: Boolean(v) } }),
  },
  {
    id: 'workbench.uiScale',
    category: 'Appearance',
    label: 'UI Scale',
    description: 'Zoom the whole interface.',
    control: {
      kind: 'select',
      options: [
        { value: '0.8', label: '80%' },
        { value: '0.9', label: '90%' },
        { value: '1', label: '100%' },
        { value: '1.1', label: '110%' },
        { value: '1.25', label: '125%' },
        { value: '1.5', label: '150%' },
      ],
    },
    get: (s) => String(s.uiScale),
    set: (s, v) => ({ ...s, uiScale: Number(v) }),
  },
  {
    id: 'workbench.followSystemTheme',
    category: 'Appearance',
    label: 'Follow System Theme',
    description: 'Match the operating system light or dark preference.',
    control: { kind: 'boolean' },
    get: (s) => s.followSystemTheme,
    set: (s, v) => ({ ...s, followSystemTheme: Boolean(v) }),
  },
  {
    id: 'appearance.theme',
    category: 'Appearance',
    label: 'Color Theme',
    description: 'The bundled color theme.',
    control: { kind: 'select', options: bundledThemeIds().map((id) => ({ value: id, label: id })) },
    get: (s) => s.themeId,
    set: (s, v) => ({ ...s, themeId: String(v) }),
  },
  {
    id: 'appearance.presentationMode',
    category: 'Appearance',
    label: 'Presentation Mode',
    description: 'How Pixie and the panels are arranged.',
    control: { kind: 'select', options: PRESENTATION_MODES.map((m) => ({ value: m, label: m })) },
    get: (s) => s.presentationMode,
    set: (s, v) => ({ ...s, presentationMode: v as PresentationMode }),
  },
  {
    id: 'accessibility.reducedMotion',
    category: 'Accessibility',
    label: 'Reduced Motion',
    description: 'Minimize animation across the app.',
    control: { kind: 'boolean' },
    get: (s) => s.reducedMotion,
    set: (s, v) => ({ ...s, reducedMotion: Boolean(v) }),
  },
  {
    id: 'accessibility.colorBlindSafe',
    category: 'Accessibility',
    label: 'Color-Blind-Safe Palette',
    description: 'Use a palette that is legible with color vision deficiency.',
    control: { kind: 'boolean' },
    get: (s) => s.colorBlindSafe,
    set: (s, v) => ({ ...s, colorBlindSafe: Boolean(v) }),
  },
  {
    id: 'sound.enabled',
    category: 'Sound',
    label: 'Sound',
    description: 'Enable sound cues (off by default).',
    control: { kind: 'boolean' },
    get: (s) => s.sound.enabled,
    set: (s, v) => ({ ...s, sound: { ...s.sound, enabled: Boolean(v) } }),
  },
];

/** True when a setting still holds its default value. */
export function isSettingDefault(def: SettingDef, settings: AppSettings): boolean {
  return def.get(settings) === def.get(DEFAULT_SETTINGS);
}

/** The default value for a setting. */
export function defaultSettingValue(def: SettingDef): SettingValue {
  return def.get(DEFAULT_SETTINGS);
}

/** Filter the schema by a free-text query over label, description, category, and id. */
export function filterSettings(query: string, schema: readonly SettingDef[]): SettingDef[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [...schema];
  return schema.filter((d) =>
    `${d.label} ${d.description} ${d.category} ${d.id}`.toLowerCase().includes(q),
  );
}
