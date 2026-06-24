import { useEffect } from 'react';
import { ACCESSIBILITY_HELP } from '../lib/a11y-help';

export interface AccessibilityHelpProps {
  open: boolean;
  onClose: () => void;
}

/** A keyboard-and-screen-reader help dialog describing how to drive vsclaude. */
export function AccessibilityHelp({ open, onClose }: AccessibilityHelpProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="a11y-overlay" role="dialog" aria-modal="true" aria-label="Accessibility help" onClick={onClose}>
      <div className="a11y-modal" onClick={(e) => e.stopPropagation()}>
        <header className="a11y-modal__header">
          <h2 className="a11y-modal__title">Accessibility Help</h2>
          <button type="button" className="btn btn--ghost" aria-label="Close accessibility help" onClick={onClose}>
            Close
          </button>
        </header>
        <dl className="a11y-modal__list">
          {ACCESSIBILITY_HELP.map((entry) => (
            <div className="a11y-modal__entry" key={entry.title}>
              <dt>{entry.title}</dt>
              <dd>{entry.detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
