import { useEffect, useRef } from 'react';
import type { AppSettings } from '@vsclaude/contracts';
import { exportTheme } from '../lib/theme';
import { useFocusRestore, useFocusTrap } from '../lib/focus-restore';

export interface ThemeExportModalProps {
  open: boolean;
  settings: AppSettings;
  onClose: () => void;
}

/** Show the active theme as JSON so it can be copied out and shared. */
export function ThemeExportModal({ open, settings, onClose }: ThemeExportModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusRestore(open);
  useFocusTrap(modalRef, open);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const json = exportTheme(settings);

  return (
    <div className="sjson-overlay" role="dialog" aria-label="Export theme" onClick={onClose}>
      <div className="sjson-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <header className="sjson-modal__header">
          <h2 className="sjson-modal__title">Export Theme</h2>
          <button
            type="button"
            className="sjson-modal__action"
            onClick={() => void navigator.clipboard?.writeText(json)}
          >
            Copy
          </button>
          <button type="button" className="btn btn--ghost" aria-label="Close export theme" onClick={onClose}>
            Close
          </button>
        </header>
        <textarea className="sjson-modal__text" aria-label="Theme JSON" readOnly spellCheck={false} value={json} />
      </div>
    </div>
  );
}
