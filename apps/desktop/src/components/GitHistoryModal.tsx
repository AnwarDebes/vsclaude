import { useEffect } from 'react';
import { gitRevert, type GitCommit } from '../lib/tauri';
import { relativeTime } from '../lib/relative-time';

export interface GitHistoryModalProps {
  commits: GitCommit[] | null;
  /** The repo path, needed to revert a commit. */
  repo?: string | null;
  /** Called after a successful revert so the list can refresh. */
  onReverted?: () => void;
  onClose: () => void;
}

/** A list of recent commits (newest first) with a per-commit revert. Escape closes it. */
export function GitHistoryModal({ commits, repo, onReverted, onClose }: GitHistoryModalProps) {
  useEffect(() => {
    if (!commits) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commits, onClose]);

  if (!commits) return null;

  const now = Date.now() / 1000;

  return (
    <div className="history-overlay" role="dialog" aria-label="Git History" onClick={onClose}>
      <div className="history-modal" onClick={(e) => e.stopPropagation()}>
        <header className="history-modal__header">
          <h2 className="history-modal__title">History</h2>
          <button type="button" className="btn btn--ghost" aria-label="Close history" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="history-modal__body">
          {commits.length === 0 ? (
            <p className="history-modal__empty">No commits yet.</p>
          ) : (
            commits.map((commit) => (
              <div key={commit.hash} className="history-row">
                <code className="history-row__hash">{commit.shortHash}</code>
                <span className="history-row__subject">{commit.subject}</span>
                <span className="history-row__meta">
                  {commit.author}, {relativeTime(commit.date, now)}
                </span>
                {repo ? (
                  <button
                    type="button"
                    className="history-row__revert"
                    aria-label={`Revert ${commit.shortHash}`}
                    onClick={() => {
                      void gitRevert(repo, commit.hash).then(() => onReverted?.());
                    }}
                  >
                    Revert
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
