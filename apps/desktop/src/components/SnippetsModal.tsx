import { useEffect } from 'react';
import { allSnippets } from '../lib/snippets';

export interface SnippetsModalProps {
  open: boolean;
  onInsert: (body: string) => void;
  onClose: () => void;
}

/** A browser of the built-in snippets; choosing one inserts it into the active editor. */
export function SnippetsModal({ open, onInsert, onClose }: SnippetsModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const snippets = allSnippets();

  return (
    <div className="snip-overlay" role="dialog" aria-label="Insert snippet" onClick={onClose}>
      <div className="snip-modal" onClick={(e) => e.stopPropagation()}>
        <header className="snip-modal__header">
          <h2 className="snip-modal__title">Insert Snippet</h2>
          <button type="button" className="btn btn--ghost" aria-label="Close snippets" onClick={onClose}>
            Close
          </button>
        </header>
        <ul className="snip-modal__list">
          {snippets.map((snippet) => (
            <li key={snippet.prefix} className="snip-modal__item">
              <button
                type="button"
                className="snip-modal__insert"
                onClick={() => {
                  onInsert(snippet.body);
                  onClose();
                }}
              >
                <span className="snip-modal__prefix">{snippet.prefix}</span>
                <span className="snip-modal__desc">{snippet.description}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
