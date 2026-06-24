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
