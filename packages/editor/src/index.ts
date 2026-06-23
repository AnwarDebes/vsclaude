/**
 * @vsclaude/editor
 *
 * Pure, dependency free domain logic for the Monaco-backed editor surface:
 * a normalized file tree model, helpers for virtualized rendering, and a tab
 * manager. No view library is imported here; this is the model layer that the
 * React or native integration will sit on top of.
 */

export type { TreeNode } from './tree.js';
export {
  buildFileTree,
  baseName,
  compareNodes,
} from './tree.js';

export type { VisibleRow } from './visible.js';
export {
  toggleExpanded,
  flattenVisible,
  collectDirectoryPaths,
} from './visible.js';

export type { Tab } from './tabs.js';
export { TabManager } from './tabs.js';

export {
  normalizePath,
  baseName as basePathName,
  parentDir,
  joinPath,
  splitExtension,
  isWithin,
  validateMove,
  deriveDuplicatePath,
} from './workspace/paths.js';

export type { WorkspaceRootInput } from './workspace/tree.js';
export { buildWorkspaceTree, mergeDirEntries, pruneSubtree, pruneSet } from './workspace/tree.js';

export type { RecentProject } from './workspace/recents.js';
export {
  RECENTS_CAP,
  addRecent,
  removeRecent,
  serializeRecents,
  parseRecents,
} from './workspace/recents.js';
