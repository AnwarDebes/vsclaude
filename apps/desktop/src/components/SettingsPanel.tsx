import { useMemo, useState } from 'react';
import { DEFAULT_SETTINGS, type AppSettings } from '@vsclaude/contracts';
import {
  defaultSettingValue,
  filterSettings,
  isSettingDefault,
  SETTINGS_SCHEMA,
  type SettingDef,
} from '../lib/settings-schema';

export interface SettingsPanelProps {
  settings: AppSettings;
  onChange: (next: AppSettings) => void;
  onClose: () => void;
}

function Control({
  def,
  settings,
  onChange,
}: {
  def: SettingDef;
  settings: AppSettings;
  onChange: (next: AppSettings) => void;
}) {
  const value = def.get(settings);
  const labelId = `setting-${def.id}`;
  if (def.control.kind === 'boolean') {
    return (
      <input
        type="checkbox"
        aria-labelledby={labelId}
        checked={Boolean(value)}
        onChange={(e) => onChange(def.set(settings, e.target.checked))}
      />
    );
  }
  if (def.control.kind === 'number') {
    return (
      <input
        type="number"
        aria-labelledby={labelId}
        className="settings__number"
        min={def.control.min}
        max={def.control.max}
        value={Number(value)}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(def.set(settings, n));
        }}
      />
    );
  }
  return (
    <select
      aria-labelledby={labelId}
      className="settings__select"
      value={String(value)}
      onChange={(e) => onChange(def.set(settings, e.target.value))}
    >
      {def.control.options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

/**
 * The Settings panel: a searchable, categorized list of preferences, each with a
 * modified indicator and a per-setting reset, plus a reset-all. It renders from
 * the settings schema, so it stays in sync with the data and the search and reset
 * work for every setting generically.
 */
export function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
  const [query, setQuery] = useState('');
  const matches = useMemo(() => filterSettings(query, SETTINGS_SCHEMA), [query]);

  const grouped = useMemo(() => {
    const byCategory = new Map<string, SettingDef[]>();
    for (const def of matches) {
      const bucket = byCategory.get(def.category);
      if (bucket) bucket.push(def);
      else byCategory.set(def.category, [def]);
    }
    return Array.from(byCategory.entries());
  }, [matches]);

  const anyModified = SETTINGS_SCHEMA.some((d) => !isSettingDefault(d, settings));

  return (
    <div className="settings-overlay" role="dialog" aria-label="Settings" onClick={onClose}>
      <div className="settings" onClick={(e) => e.stopPropagation()}>
        <header className="settings__header">
          <h2 className="settings__title">Settings</h2>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={!anyModified}
            onClick={() => onChange(DEFAULT_SETTINGS)}
          >
            Reset All
          </button>
          <button type="button" className="btn btn--ghost settings__close" aria-label="Close Settings" onClick={onClose}>
            Close
          </button>
        </header>

        <input
          className="settings__search"
          aria-label="Search settings"
          placeholder="Search settings"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        <div className="settings__body">
          {grouped.length === 0 ? <p className="settings__empty">No settings match your search.</p> : null}
          {grouped.map(([category, defs]) => (
            <section key={category} className="settings__group" aria-label={category}>
              <h3 className="settings__category">{category}</h3>
              {defs.map((def) => {
                const modified = !isSettingDefault(def, settings);
                return (
                  <div key={def.id} className="settings__row">
                    <div className="settings__meta">
                      <span id={`setting-${def.id}`} className="settings__label">
                        {modified ? <span className="settings__dot" aria-label="Modified" title="Modified" /> : null}
                        {def.label}
                      </span>
                      <span className="settings__desc">{def.description}</span>
                    </div>
                    <div className="settings__control">
                      <Control def={def} settings={settings} onChange={onChange} />
                      {modified ? (
                        <button
                          type="button"
                          className="settings__reset"
                          aria-label={`Reset ${def.label} to default`}
                          onClick={() => onChange(def.set(settings, defaultSettingValue(def)))}
                        >
                          Reset
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
