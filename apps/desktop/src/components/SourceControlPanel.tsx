import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  parsePorcelainStatus,
  scmGroups,
  type GitFileChange,
  type GitStatusModel,
} from '@vsclaude/git';
import { filterQuickPick } from '@vsclaude/core-shell';
import { basePathName } from '@vsclaude/editor';
import {
  gitBranches,
  gitCheckout,
  gitCommitStaged,
  gitCreateBranch,
  gitStage,
  gitStatus,
  gitUnstage,
  isTauri,
  type BranchList,
} from '../lib/tauri';

export interface SourceControlPanelProps {
  /** The repo root, or null when no workspace is open. */
  repo: string | null;
  /** Open a file's diff (working tree vs HEAD) when its row is clicked. */
  onDiff: (change: GitFileChange) => void;
  onClose: () => void;
  /** Notifies the app after a git action so the status bar refreshes. */
  onChanged?: () => void;
}

function dirOf(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash >= 0 ? path.slice(0, slash) : '';
}

/**
 * The Source Control panel: stage and unstage files, commit the staged set, and
 * switch or create a branch. It reuses the porcelain parser and the quick-pick
 * filter; the git engine stays a thin wrapper over the CLI. In the browser demo
 * (no workspace) it invites the user to open a folder.
 */
export function SourceControlPanel({ repo, onDiff, onClose, onChanged }: SourceControlPanelProps) {
  const [status, setStatus] = useState<GitStatusModel | null>(null);
  const [branches, setBranches] = useState<BranchList | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [branchFilter, setBranchFilter] = useState('');

  const refresh = useCallback(async () => {
    if (!isTauri() || !repo) {
      setStatus(null);
      setBranches(null);
      return;
    }
    try {
      const [statusText, branchList] = await Promise.all([gitStatus(repo), gitBranches(repo)]);
      setStatus(parsePorcelainStatus(statusText));
      setBranches(branchList);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [repo]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const groups = useMemo(
    () => (status ? scmGroups(status) : { staged: [], changes: [] as GitFileChange[] }),
    [status],
  );

  const act = useCallback(
    async (fn: () => Promise<unknown>) => {
      if (!repo) return;
      setBusy(true);
      try {
        await fn();
        setError(null);
        await refresh();
        onChanged?.();
      } catch (e) {
        setError(String(e));
      } finally {
        setBusy(false);
      }
    },
    [repo, refresh, onChanged],
  );

  const stage = (paths: string[]) => repo && act(() => gitStage(repo, paths));
  const unstage = (paths: string[]) => repo && act(() => gitUnstage(repo, paths));
  const commit = () =>
    repo && message.trim() && act(() => gitCommitStaged(repo, message.trim()).then(() => setMessage('')));
  const checkout = (branch: string) =>
    repo &&
    act(() => gitCheckout(repo, branch)).then(() => {
      setBranchMenuOpen(false);
      setBranchFilter('');
    });
  const createBranch = (name: string) =>
    repo &&
    act(() => gitCreateBranch(repo, name)).then(() => {
      setBranchMenuOpen(false);
      setBranchFilter('');
    });

  const branchLabelText = branches?.current ?? (branches?.detached ? 'detached HEAD' : 'no branch');
  const branchItems = useMemo(
    () => filterQuickPick(branchFilter, (branches?.branches ?? []).map((b) => ({ id: b, label: b }))),
    [branchFilter, branches],
  );
  const trimmedFilter = branchFilter.trim();
  const canCreate =
    trimmedFilter.length > 0 && !(branches?.branches ?? []).includes(trimmedFilter);

  const renderFile = (change: GitFileChange, action: 'stage' | 'unstage') => {
    const code = change.code.trim() || '??';
    return (
      <li key={`${action}-${change.path}`} className="scm__row">
        <button
          type="button"
          className="scm__file"
          title={`${change.path} (open diff)`}
          onClick={() => onDiff(change)}
        >
          <span className={`scm__badge scm__badge--${code[0] ?? '?'}`}>{code}</span>
          <span className="scm__filename">{basePathName(change.path)}</span>
          <span className="scm__filedir">{dirOf(change.path)}</span>
        </button>
        <button
          type="button"
          className="scm__action"
          aria-label={`${action === 'stage' ? 'Stage' : 'Unstage'} ${change.path}`}
          disabled={busy}
          onClick={() => (action === 'stage' ? stage([change.path]) : unstage([change.path]))}
        >
          {action === 'stage' ? '+' : '-'}
        </button>
      </li>
    );
  };

  return (
    <section className="scm" role="region" aria-label="Source Control">
      <header className="scm__header">
        <h2 className="scm__title">Source Control</h2>
        {isTauri() && repo ? (
          <button
            type="button"
            className="scm__branch"
            aria-haspopup="true"
            aria-expanded={branchMenuOpen}
            title="Switch or create a branch"
            onClick={() => setBranchMenuOpen((o) => !o)}
          >
            {branchLabelText}
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn--ghost scm__close"
          aria-label="Close Source Control panel"
          onClick={onClose}
        >
          Close
        </button>
      </header>

      {branchMenuOpen ? (
        <div className="scm__branchmenu" role="group" aria-label="Branches">
          <input
            className="scm__branchfilter"
            aria-label="Filter or name a branch"
            placeholder="Filter branches, or type a new name"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            autoFocus
          />
          <ul className="scm__branchlist">
            {branchItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`scm__branchitem${item.id === branches?.current ? ' is-current' : ''}`}
                  onClick={() => void checkout(item.id)}
                >
                  {item.label}
                </button>
              </li>
            ))}
            {canCreate ? (
              <li>
                <button
                  type="button"
                  className="scm__branchitem scm__branchitem--create"
                  onClick={() => void createBranch(trimmedFilter)}
                >
                  Create branch: {trimmedFilter}
                </button>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {!isTauri() || !repo ? (
        <p className="scm__note">Open a folder under git to use Source Control.</p>
      ) : error ? (
        <p className="scm__error">{error}</p>
      ) : (
        <div className="scm__body">
          <div className="scm__commit">
            <input
              className="scm__message"
              aria-label="Commit message"
              placeholder="Message (commits the staged changes)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button
              type="button"
              className="btn scm__commitbtn"
              disabled={busy || message.trim().length === 0 || groups.staged.length === 0}
              onClick={() => void commit()}
            >
              Commit
            </button>
          </div>

          <div className="scm__group">
            <div className="scm__grouphead">
              <span className="scm__groupname">Staged Changes</span>
              <span className="scm__groupcount">{groups.staged.length}</span>
              {groups.staged.length > 0 ? (
                <button
                  type="button"
                  className="scm__groupaction"
                  disabled={busy}
                  onClick={() => void unstage(groups.staged.map((c) => c.path))}
                >
                  Unstage All
                </button>
              ) : null}
            </div>
            <ul className="scm__list">{groups.staged.map((c) => renderFile(c, 'unstage'))}</ul>
          </div>

          <div className="scm__group">
            <div className="scm__grouphead">
              <span className="scm__groupname">Changes</span>
              <span className="scm__groupcount">{groups.changes.length}</span>
              {groups.changes.length > 0 ? (
                <button
                  type="button"
                  className="scm__groupaction"
                  disabled={busy}
                  onClick={() => void stage(groups.changes.map((c) => c.path))}
                >
                  Stage All
                </button>
              ) : null}
            </div>
            <ul className="scm__list">{groups.changes.map((c) => renderFile(c, 'stage'))}</ul>
          </div>

          {groups.staged.length === 0 && groups.changes.length === 0 ? (
            <p className="scm__note">No changes. The working tree is clean.</p>
          ) : null}
        </div>
      )}
    </section>
  );
}
