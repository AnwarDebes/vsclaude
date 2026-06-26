import { useEffect, useRef, useState } from 'react';
import type { Theme } from '@vsclaude/contracts';
import { parseImportedTheme } from '../lib/theme';
import { useFocusRestore, useFocusTrap } from '../lib/focus-restore';

export interface ThemeImportModalProps {
  open: boolean;
  onApply: (theme: Theme) => void;
  onClose: () => void;
}

/** Paste a theme JSON (as produced by Theme: Export) and apply it as a custom theme. */
export function ThemeImportModal({ open, onApply, onClose }: ThemeImportModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusRestore(open);
  useFocusTrap(modalRef, open);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setText('');
    setError(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const apply = () => {
    const theme = parseImportedTheme(text);
    if (!theme) {
      setError('That is not a valid theme. Paste the JSON from Theme: Export.');
      return;
    }
    onApply(theme);
    onClose();
  };

  return (
    <div className="sjson-overlay" role="dialog" aria-label="Import theme" onClick={onClose}>
      <div className="sjson-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <header className="sjson-modal__header">
          <h2 className="sjson-modal__title">Import Theme</h2>
          <button type="button" className="sjson-modal__action" onClick={apply}>
            Apply
          </button>
          <button type="button" className="btn btn--ghost" aria-label="Close import theme" onClick={onClose}>
            Close
          </button>
        </header>
        <textarea
          className="sjson-modal__text"
          aria-label="Theme JSON"
          spellCheck={false}
          placeholder="Paste a theme JSON (from Theme: Export)"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
        />
        {error ? (
          <p className="sjson-modal__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
