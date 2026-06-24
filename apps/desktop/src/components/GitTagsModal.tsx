import { useCallback, useEffect, useState } from 'react';
import { gitCreateTag, gitDeleteTag, gitTags } from '../lib/tauri';

export interface GitTagsModalProps {
  open: boolean;
  repo: string | null;
  onClose: () => void;
}

/** Create, list, and delete git tags. Tags load when the modal opens. */
export function GitTagsModal({ open, repo, onClose }: GitTagsModalProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!repo) {
      setTags([]);
      return;
    }
    try {
      setTags(await gitTags(repo));
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [repo]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const create = async () => {
    const trimmed = name.trim();
    if (!repo || !trimmed) return;
    try {
      await gitCreateTag(repo, trimmed);
      setName('');
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  const remove = async (tag: string) => {
    if (!repo) return;
    try {
      await gitDeleteTag(repo, tag);
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="tags-overlay" role="dialog" aria-label="Git Tags" onClick={onClose}>
      <div className="tags-modal" onClick={(e) => e.stopPropagation()}>
        <header className="tags-modal__header">
          <h2 className="tags-modal__title">Tags</h2>
          <button type="button" className="btn btn--ghost" aria-label="Close tags" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="tags-modal__body">
          {!repo ? (
            <p className="tags-modal__note">Open a folder under git to manage tags.</p>
          ) : (
            <>
              <form
                className="tags-modal__create"
                onSubmit={(e) => {
                  e.preventDefault();
                  void create();
                }}
              >
                <input
                  className="tags-modal__input"
                  aria-label="New tag name"
                  placeholder="New tag name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <button type="submit" className="btn">
                  Create
                </button>
              </form>
              {error ? <p className="tags-modal__error">{error}</p> : null}
              {tags.length === 0 ? (
                <p className="tags-modal__note">No tags yet.</p>
              ) : (
                <ul className="tags-modal__list">
                  {tags.map((tag) => (
                    <li key={tag} className="tags-row">
                      <span className="tags-row__name">{tag}</span>
                      <button
                        type="button"
                        className="tags-row__delete"
                        aria-label={`Delete tag ${tag}`}
                        onClick={() => void remove(tag)}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
