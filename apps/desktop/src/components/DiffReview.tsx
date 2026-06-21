import { Fragment, useCallback, useEffect, useState } from 'react';
import { parsePorcelainStatus, type GitFileChange, type GitStatusModel } from '@vsclaude/git';
import { gitCommit, gitDiff, gitStatus, isTauri } from '../lib/tauri';

interface DiffReviewProps {
  open: boolean;
  cwd: string;
  onClose: () => void;
}

function renderDiff(diff: string) {
  if (!diff) return <span className="diff-line diff-line--ctx">Select a file to see its diff.</span>;
  return diff.split('\n').map((line, i) => {
    const kind = line.startsWith('+')
      ? 'add'
      : line.startsWith('-')
        ? 'del'
        : line.startsWith('@@')
          ? 'hunk'
          : 'ctx';
    return (
      <Fragment key={i}>
        <span className={`diff-line diff-line--${kind}`}>{line}</span>
        {'\n'}
      </Fragment>
    );
  });
}

/**
 * Review the agent's working-tree changes and commit them. The file list and
 * branch come from `git status` (parsed by the git package), each file's diff
 * from `git diff`, and "Accept all and commit" stages everything and commits for
 * real. Runs in the native app; the browser shows a note.
 */
export function DiffReview({ open, cwd, onClose }: DiffReviewProps) {
  const [status, setStatus] = useState<GitStatusModel | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [diff, setDiff] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!isTauri()) return;
    try {
      setStatus(parsePorcelainStatus(await gitStatus(cwd)));
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [cwd]);

  useEffect(() => {
    if (open) {
      setSelected(null);
      setDiff('');
      void refresh();
    }
  }, [open, refresh]);

  if (!open) return null;

  const files: GitFileChange[] = status
    ? [...status.staged, ...status.unstaged, ...status.untracked]
    : [];

  const pick = async (path: string) => {
    setSelected(path);
    try {
      setDiff(await gitDiff(cwd, path));
    } catch (e) {
      setError(String(e));
    }
  };

  const commit = async () => {
    if (!message.trim()) return;
    setBusy(true);
    try {
      await gitCommit(cwd, message.trim());
      setMessage('');
      setDiff('');
      setSelected(null);
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="review-overlay" role="dialog" aria-label="Review changes" onClick={onClose}>
      <div className="review" onClick={(e) => e.stopPropagation()}>
        <header className="review__header">
          <h2 className="review__title">
            Review changes{status?.branch.branch ? ` on ${status.branch.branch}` : ''}
          </h2>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </header>

        {!isTauri() ? (
          <p className="review__note">Git review and commit run in the native app.</p>
        ) : error ? (
          <p className="review__error">{error}</p>
        ) : (
          <div className="review__body">
            <ul className="review__files">
              {files.map((f) => (
                <li key={`${f.code}-${f.path}`}>
                  <button
                    type="button"
                    className={`review__file${selected === f.path ? ' is-selected' : ''}`}
                    onClick={() => void pick(f.path)}
                  >
                    <span className="review__badge">{f.code.trim() || '??'}</span>
                    {f.path}
                  </button>
                </li>
              ))}
              {status?.clean ? <li className="review__clean">Working tree clean.</li> : null}
            </ul>
            <pre className="review__diff">{renderDiff(diff)}</pre>
          </div>
        )}

        <footer className="review__commit">
          <input
            className="review__msg"
            placeholder="Commit message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button type="button" className="btn" disabled={busy || !message.trim()} onClick={() => void commit()}>
            Accept all and commit
          </button>
        </footer>
      </div>
    </div>
  );
}
