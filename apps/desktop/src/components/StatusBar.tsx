import { useEffect, useState, useSyncExternalStore } from 'react';
import { orderStatusItems, type StatusBarItem } from '@vsclaude/core-shell';
import { parsePorcelainStatus } from '@vsclaude/git';
import {
  getEditorStatus,
  subscribeEditorStatus,
  type EditorStatus,
} from '../lib/editor-bridge';
import { gitStatus, isTauri } from '../lib/tauri';

/** Live view of the active editor's status, for the bar. */
export function useEditorStatus(): EditorStatus | null {
  return useSyncExternalStore(subscribeEditorStatus, getEditorStatus, getEditorStatus);
}

export interface GitStatusSummary {
  branch: string;
  ahead: number;
  behind: number;
  changes: number;
}

/**
 * Reads the branch and change count for a repo through the same porcelain path
 * the review overlay uses. Native only: in the browser demo it stays null and
 * the bar simply omits the git item. Refreshes on mount and when the window
 * regains focus, which catches commits and branch switches made elsewhere.
 */
export function useGitStatus(repoPath: string | null): GitStatusSummary | null {
  const [summary, setSummary] = useState<GitStatusSummary | null>(null);
  useEffect(() => {
    if (!isTauri() || !repoPath) {
      setSummary(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const model = parsePorcelainStatus(await gitStatus(repoPath));
        if (cancelled) return;
        setSummary({
          branch: model.branch.branch ?? (model.branch.detached ? 'detached HEAD' : 'no branch'),
          ahead: model.branch.ahead,
          behind: model.branch.behind,
          changes: model.staged.length + model.unstaged.length + model.untracked.length,
        });
      } catch {
        if (!cancelled) setSummary(null);
      }
    };
    void load();
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, [repoPath]);
  return summary;
}

export interface StatusBarProps {
  items: readonly StatusBarItem[];
  onCommand: (commandId: string) => void;
}

/**
 * The workbench status bar: an always-present bottom strip with a left and a
 * right group, rendered from a flat item list. Items that carry a command are
 * real buttons; the rest are labeled static text. There is no live region, so a
 * moving caret does not spam a screen reader on every keystroke.
 */
export function StatusBar({ items, onCommand }: StatusBarProps) {
  const left = orderStatusItems(items, 'left');
  const right = orderStatusItems(items, 'right');

  const renderItem = (item: StatusBarItem) => {
    const label = item.ariaLabel ?? item.text;
    if (item.command) {
      const command = item.command;
      return (
        <button
          key={item.id}
          type="button"
          className="status-bar__item status-bar__item--button"
          title={item.tooltip}
          aria-label={label}
          onClick={() => onCommand(command)}
        >
          {item.text}
        </button>
      );
    }
    return (
      <span key={item.id} className="status-bar__item" title={item.tooltip} aria-label={label}>
        {item.text}
      </span>
    );
  };

  return (
    <div className="status-bar" role="group" aria-label="Status bar">
      <div className="status-bar__group status-bar__group--left">{left.map(renderItem)}</div>
      <div className="status-bar__group status-bar__group--right">{right.map(renderItem)}</div>
    </div>
  );
}
