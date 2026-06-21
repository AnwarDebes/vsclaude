/**
 * Domain model for parsed git status output.
 *
 * The shapes here are the normalized result of reading
 * `git status --porcelain=v1 -b`. They are deliberately UI agnostic so any
 * panel, visualization, or event mapper can consume them.
 */

/**
 * A single file change as reported by git porcelain output.
 *
 * `code` is the raw two character XY status code from porcelain v1 (for
 * example "M ", " M", "??", "R ", "A "). `path` is the working tree path.
 * For renames and copies `origPath` holds the source path.
 */
export interface GitFileChange {
  /** Working tree path of the change. */
  readonly path: string;
  /** Raw two character XY porcelain status code (preserves spaces). */
  readonly code: string;
  /** Original path for renames or copies, when present. */
  readonly origPath?: string;
}

/**
 * Branch and tracking information from the porcelain header line
 * (the line beginning with `## `).
 */
export interface GitBranchInfo {
  /** Local branch name, or undefined when on a detached HEAD. */
  readonly branch?: string;
  /** Upstream tracking branch, when configured. */
  readonly upstream?: string;
  /** Number of commits ahead of upstream. */
  readonly ahead: number;
  /** Number of commits behind upstream. */
  readonly behind: number;
  /** True when porcelain reports the working copy has no commits yet. */
  readonly detached: boolean;
}

/**
 * Fully parsed git status, partitioned into the three buckets a trader of
 * code cares about: what is staged, what is modified but unstaged, and what
 * is untracked.
 */
export interface GitStatusModel {
  /** Branch and tracking metadata. */
  readonly branch: GitBranchInfo;
  /** Changes present in the index (first XY column is not space or `?`). */
  readonly staged: readonly GitFileChange[];
  /** Changes in the working tree but not staged (second XY column is set). */
  readonly unstaged: readonly GitFileChange[];
  /** Untracked files (XY code `??`). */
  readonly untracked: readonly GitFileChange[];
  /** True when there is nothing to commit and the tree is clean. */
  readonly clean: boolean;
}

/** Default empty branch info used when no header line is present. */
export const EMPTY_BRANCH_INFO: GitBranchInfo = {
  ahead: 0,
  behind: 0,
  detached: false,
};
