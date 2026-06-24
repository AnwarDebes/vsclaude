import { useEffect, useState } from 'react';
import { DiffView } from './DiffView';

export interface DiffTarget {
  name: string;
  original: string;
  modified: string;
  language?: string;
  /** A short label for what is being compared, for example "working tree vs HEAD". */
  subtitle?: string;
}

export interface DiffModalProps {
  target: DiffTarget | null;
  onClose: () => void;
}

/**
 * A modal that shows a single file's diff in a Monaco diff editor, with a toggle
 * between side-by-side and inline. Used by Compare with Saved (unsaved changes vs
 * disk) and by the Source Control panel (working tree vs HEAD).
 */
export function DiffModal({ target, onClose }: DiffModalProps) {
  const [sideBySide, setSideBySide] = useState(true);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, onClose]);

  if (!target) return null;

  return (
    <div className="diff-overlay" role="dialog" aria-label={`Diff of ${target.name}`} onClick={onClose}>
      <div className="diff-modal" onClick={(e) => e.stopPropagation()}>
        <header className="diff-modal__header">
          <h2 className="diff-modal__title">
            {target.name}
            {target.subtitle ? <span className="diff-modal__subtitle">{target.subtitle}</span> : null}
          </h2>
          <div className="diff-modal__actions">
            <button
              type="button"
              className={`chip${sideBySide ? ' chip--on' : ''}`}
              aria-pressed={sideBySide}
              onClick={() => setSideBySide(true)}
            >
              Side by side
            </button>
            <button
              type="button"
              className={`chip${!sideBySide ? ' chip--on' : ''}`}
              aria-pressed={!sideBySide}
              onClick={() => setSideBySide(false)}
            >
              Inline
            </button>
            <button type="button" className="btn btn--ghost" aria-label="Close diff" onClick={onClose}>
              Close
            </button>
          </div>
        </header>
        <div className="diff-modal__body">
          <DiffView
            original={target.original}
            modified={target.modified}
            language={target.language}
            sideBySide={sideBySide}
          />
        </div>
      </div>
    </div>
  );
}
