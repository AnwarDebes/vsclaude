/**
 * @vsclaude/git
 *
 * Pure TypeScript git domain logic for the vsclaude IDE: parse porcelain
 * status output into a normalized model, summarize it for status bars, and
 * map git operations onto normalized AgentEvents.
 */

export type {
  GitFileChange,
  GitBranchInfo,
  GitStatusModel,
} from './model.js';
export { EMPTY_BRANCH_INFO } from './model.js';

export { parsePorcelainStatus } from './parse.js';

export { summarizeStatus, branchLabel } from './summarize.js';

export type { GitAction, GitActionContext } from './events.js';
export {
  GIT_ACTIONS,
  isGitAction,
  captionForAction,
  gitActionEvent,
} from './events.js';
