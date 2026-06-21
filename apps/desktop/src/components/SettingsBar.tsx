import type { AppSettings, PresentationMode } from '@vsclaude/contracts';
import { bundledThemeIds } from '@vsclaude/design-system';

const MODES: PresentationMode[] = ['companion', 'stage', 'swarm', 'minimal', 'cozy'];

interface SettingsBarProps {
  settings: AppSettings;
  onSettings: (next: AppSettings) => void;
  playing: boolean;
  setPlaying: (playing: boolean) => void;
  restart: () => void;
  index: number;
  total: number;
}

/**
 * The control bar: presentation mode, theme, reduced motion, sound, and the demo
 * playback controls. Every change flows through the settings object, which is
 * applied to the document and persisted.
 */
export function SettingsBar({
  settings,
  onSettings,
  playing,
  setPlaying,
  restart,
  index,
  total,
}: SettingsBarProps) {
  return (
    <div className="settings-bar">
      <div className="settings-bar__modes" role="group" aria-label="Presentation mode">
        {MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            className={`chip${settings.presentationMode === mode ? ' chip--on' : ''}`}
            aria-pressed={settings.presentationMode === mode}
            onClick={() => onSettings({ ...settings, presentationMode: mode })}
          >
            {mode}
          </button>
        ))}
      </div>

      <label className="settings-bar__field">
        <span className="settings-bar__label">Theme</span>
        <select
          className="settings-bar__select"
          value={settings.themeId}
          onChange={(e) => onSettings({ ...settings, themeId: e.target.value })}
        >
          {bundledThemeIds().map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className={`chip${settings.reducedMotion ? ' chip--on' : ''}`}
        aria-pressed={settings.reducedMotion}
        onClick={() => onSettings({ ...settings, reducedMotion: !settings.reducedMotion })}
      >
        reduced motion
      </button>

      <button
        type="button"
        className={`chip${settings.sound.enabled ? ' chip--on' : ''}`}
        aria-pressed={settings.sound.enabled}
        onClick={() =>
          onSettings({ ...settings, sound: { ...settings.sound, enabled: !settings.sound.enabled } })
        }
      >
        sound
      </button>

      <span className="settings-bar__spacer" />

      <span className="settings-bar__progress" aria-live="off">
        {index + 1} / {total}
      </span>
      <button type="button" className="btn" onClick={() => setPlaying(!playing)}>
        {playing ? 'Pause' : 'Play'}
      </button>
      <button type="button" className="btn btn--ghost" onClick={restart}>
        Replay
      </button>
    </div>
  );
}
