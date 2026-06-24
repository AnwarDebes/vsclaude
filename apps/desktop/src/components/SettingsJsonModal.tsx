import { useEffect, useState } from 'react';
import type { AppSettings } from '@vsclaude/contracts';
import { loadSettings, serializeSettings } from '@vsclaude/persistence';

export interface SettingsJsonModalProps {
  open: boolean;
  settings: AppSettings;
  onApply: (next: AppSettings) => void;
  onClose: () => void;
}

/**
 * Edit the settings as JSON. The text seeds from the current settings; Apply parses
 * it (invalid JSON is reported, not applied) and merges over the defaults through
 * loadSettings, so a partial document keeps the rest. Also supports export by copy.
 */
export function SettingsJsonModal({ open, settings, onApply, onClose }: SettingsJsonModalProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setText(serializeSettings(settings));
      setError(null);
    }
  }, [open, settings]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const apply = () => {
    try {
      JSON.parse(text);
    } catch {
      setError('Invalid JSON.');
      return;
    }
    onApply(loadSettings(text));
    onClose();
  };

  return (
    <div className="sjson-overlay" role="dialog" aria-label="Settings JSON" onClick={onClose}>
      <div className="sjson-modal" onClick={(e) => e.stopPropagation()}>
        <header className="sjson-modal__header">
          <h2 className="sjson-modal__title">Settings (JSON)</h2>
          <button
            type="button"
            className="sjson-modal__action"
            onClick={() => void navigator.clipboard?.writeText(text)}
          >
            Copy
          </button>
          <button type="button" className="btn sjson-modal__apply" onClick={apply}>
            Apply
          </button>
          <button type="button" className="btn btn--ghost" aria-label="Close settings JSON" onClick={onClose}>
            Close
          </button>
        </header>
        {error ? <p className="sjson-modal__error">{error}</p> : null}
        <textarea
          className="sjson-modal__text"
          aria-label="Settings JSON"
          spellCheck={false}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
    </div>
  );
}
