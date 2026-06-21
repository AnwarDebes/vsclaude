import type { GitStatusModel } from './model.js';

/**
 * Pluralize a noun based on a count without dragging in a dependency.
 *
 * @param count The quantity.
 * @param singular The singular noun form.
 * @param plural Optional explicit plural; defaults to `singular + "s"`.
 */
function plural(count: number, singular: string, plural?: string): string {
  if (count === 1) {
    return `${count} ${singular}`;
  }
  return `${count} ${plural ?? `${singular}s`}`;
}

/**
 * Produce a short, human readable summary of a status model.
 *
 * Examples:
 *   "clean"
 *   "3 staged, 1 modified, 2 untracked"
 *   "1 staged"
 *
 * Only non zero buckets are listed so the string stays compact. The word
 * "modified" is used for unstaged changes because it reads naturally in a
 * status bar even though the underlying codes can be more varied.
 *
 * @param model A parsed {@link GitStatusModel}.
 * @returns A compact one line summary.
 */
export function summarizeStatus(model: GitStatusModel): string {
  const parts: string[] = [];
  if (model.staged.length > 0) {
    parts.push(plural(model.staged.length, 'staged', 'staged'));
  }
  if (model.unstaged.length > 0) {
    parts.push(plural(model.unstaged.length, 'modified', 'modified'));
  }
  if (model.untracked.length > 0) {
    parts.push(plural(model.untracked.length, 'untracked', 'untracked'));
  }
  if (parts.length === 0) {
    return 'clean';
  }
  return parts.join(', ');
}

/**
 * Produce a compact branch label including ahead and behind markers.
 *
 * Examples: "main", "main ↑2", "main ↓1", "main ↑2 ↓1", "(detached)".
 *
 * @param model A parsed {@link GitStatusModel}.
 * @returns A short branch label suitable for a status bar.
 */
export function branchLabel(model: GitStatusModel): string {
  const { branch } = model;
  if (branch.detached || branch.branch === undefined) {
    return '(detached)';
  }
  const segments: string[] = [branch.branch];
  if (branch.ahead > 0) {
    segments.push(`↑${branch.ahead}`);
  }
  if (branch.behind > 0) {
    segments.push(`↓${branch.behind}`);
  }
  return segments.join(' ');
}
