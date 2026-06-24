import { useEffect } from 'react';
import { RELEASE_NOTES } from '../lib/release-notes';

export interface ReleaseNotesProps {
  open: boolean;
  onClose: () => void;
}

/** A What's New panel summarizing the editor's capabilities. Escape closes it. */
export function ReleaseNotes({ open, onClose }: ReleaseNotesProps) {
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
    <div className="release-overlay" role="dialog" aria-label="Release Notes" onClick={onClose}>
      <div className="release-modal" onClick={(e) => e.stopPropagation()}>
        <header className="release-modal__header">
          <h2 className="release-modal__title">What's New</h2>
          <button type="button" className="btn btn--ghost" aria-label="Close release notes" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="release-modal__body">
          {RELEASE_NOTES.map((section) => (
            <section key={section.title} className="release-section">
              <h3 className="release-section__title">{section.title}</h3>
              <ul className="release-section__list">
                {section.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
