/**
 * Source-control view groups.
 *
 * The Source Control panel shows two buckets: Staged Changes (what the index
 * holds) and Changes (working-tree modifications plus untracked files). This
 * helper derives those buckets from the normalized status model. A file can be
 * in both, for example a partially staged file ("MM"), which is correct: it has
 * staged and unstaged changes at once.
 */
import type { GitFileChange, GitStatusModel } from './model.js';

/** The two groups the Source Control panel renders. */
export interface ScmGroups {
  staged: readonly GitFileChange[];
  /** Working-tree modifications followed by untracked files. */
  changes: GitFileChange[];
}

/** Partition a status model into the staged and changes groups. */
export function scmGroups(model: GitStatusModel): ScmGroups {
  return {
    staged: model.staged,
    changes: [...model.unstaged, ...model.untracked],
  };
}

/** Total number of file entries across both groups. */
export function scmChangeCount(model: GitStatusModel): number {
  return model.staged.length + model.unstaged.length + model.untracked.length;
}
