/**
 * @vsclaude/agent-runtime
 *
 * The session-state core of vsclaude. It turns a stream of normalized
 * {@link import('@vsclaude/contracts').AgentEvent}s into a live delegation
 * {@link import('@vsclaude/contracts').AgentTree} that the swarm view, the
 * mascot engine, and the chat panel render.
 *
 * Two layers live here:
 * - {@link reduceAgentTree}: a pure fold from an event log to an `AgentTree`.
 * - {@link SessionManager}: a thin stateful driver that ingests events one at a
 *   time and notifies subscribers when the tree changes.
 *
 * Everything is dependency-free and deterministic, so a session can be replayed
 * from its persisted log to reconstruct identical state.
 */

export { reduceAgentTree, TERMINAL_STATUSES } from './reduce.js';
export { SessionManager } from './session-manager.js';
export type { TreeListener, Unsubscribe } from './session-manager.js';
export {
  getRootNode,
  childrenOf,
  walkTree,
  countActiveAgents,
  totalTokenUsage,
  isSessionComplete,
} from './tree-utils.js';
