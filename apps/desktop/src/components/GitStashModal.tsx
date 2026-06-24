import { useCallback, useEffect, useState } from 'react';
import { gitStash, gitStashApply, gitStashDrop, gitStashList } from '../lib/tauri';
import { parseStashList, type StashEntry } from '../lib/stash';

export interface GitStashModalProps {
  open: boolean;
  repo: string | null;
  onClose: () => void;
  /** Called after a change so the SCM panel can refresh. */
  onChanged?: () => void;
}

/** List the git stashes with apply and drop, plus stash the current changes. */
export function GitStashModal({ open, repo, onClose, onChanged }: GitStashModalProps) {
  const [entries, setEntries] = useState<StashEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!repo) {
      setEntries([]);
      return;
    }
    try {
      setEntries(parseStashList(await gitStashList(repo)));
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

  const run = async (action: () => Promise<void>) => {
    if (!repo) return;
    try {
      await action();
      await refresh();
      onChanged?.();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="tags-overlay" role="dialog" aria-label="Git Stashes" onClick={onClose}>
      <div className="tags-modal" onClick={(e) => e.stopPropagation()}>
        <header className="tags-modal__header">
          <h2 className="tags-modal__title">Stashes</h2>
          <button type="button" className="btn btn--ghost" aria-label="Close stashes" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="tags-modal__body">
          {!repo ? (
            <p className="tags-modal__note">Open a folder under git to manage stashes.</p>
          ) : (
            <>
              <button type="button" className="btn" onClick={() => void run(() => gitStash(repo))}>
                Stash Current Changes
              </button>
              {error ? <p className="tags-modal__error">{error}</p> : null}
              {entries.length === 0 ? (
                <p className="tags-modal__note">No stashes.</p>
              ) : (
                <ul className="tags-modal__list">
                  {entries.map((entry) => (
                    <li key={entry.ref} className="tags-row">
                      <span className="tags-row__url">{entry.description}</span>
                      <button
                        type="button"
                        className="tags-row__delete"
                        aria-label={`Apply ${entry.ref}`}
                        onClick={() => void run(() => gitStashApply(repo, entry.index))}
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        className="tags-row__delete"
                        aria-label={`Drop ${entry.ref}`}
                        onClick={() => void run(() => gitStashDrop(repo, entry.index))}
                      >
                        Drop
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
