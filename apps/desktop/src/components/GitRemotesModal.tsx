import { useCallback, useEffect, useState } from 'react';
import { gitRemoteAdd, gitRemoteRemove, gitRemotes, type GitRemote } from '../lib/tauri';

export interface GitRemotesModalProps {
  open: boolean;
  repo: string | null;
  onClose: () => void;
}

/** Add, list, and remove git remotes. Remotes load when the modal opens. */
export function GitRemotesModal({ open, repo, onClose }: GitRemotesModalProps) {
  const [remotes, setRemotes] = useState<GitRemote[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!repo) {
      setRemotes([]);
      return;
    }
    try {
      setRemotes(await gitRemotes(repo));
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

  const add = async () => {
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    if (!repo || !trimmedName || !trimmedUrl) return;
    try {
      await gitRemoteAdd(repo, trimmedName, trimmedUrl);
      setName('');
      setUrl('');
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  const remove = async (remote: string) => {
    if (!repo) return;
    try {
      await gitRemoteRemove(repo, remote);
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="tags-overlay" role="dialog" aria-label="Git Remotes" onClick={onClose}>
      <div className="tags-modal" onClick={(e) => e.stopPropagation()}>
        <header className="tags-modal__header">
          <h2 className="tags-modal__title">Remotes</h2>
          <button type="button" className="btn btn--ghost" aria-label="Close remotes" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="tags-modal__body">
          {!repo ? (
            <p className="tags-modal__note">Open a folder under git to manage remotes.</p>
          ) : (
            <>
              <form
                className="tags-modal__create"
                onSubmit={(e) => {
                  e.preventDefault();
                  void add();
                }}
              >
                <input
                  className="tags-modal__input"
                  aria-label="New remote name"
                  placeholder="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  className="tags-modal__input"
                  aria-label="New remote URL"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <button type="submit" className="btn">
                  Add
                </button>
              </form>
              {error ? <p className="tags-modal__error">{error}</p> : null}
              {remotes.length === 0 ? (
                <p className="tags-modal__note">No remotes yet.</p>
              ) : (
                <ul className="tags-modal__list">
                  {remotes.map((remote) => (
                    <li key={remote.name} className="tags-row">
                      <span className="tags-row__name">{remote.name}</span>
                      <span className="tags-row__url">{remote.url}</span>
                      <button
                        type="button"
                        className="tags-row__delete"
                        aria-label={`Remove remote ${remote.name}`}
                        onClick={() => void remove(remote.name)}
                      >
                        Remove
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
