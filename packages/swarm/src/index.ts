/**
 * @vsclaude/swarm
 *
 * Orchestration view model for the vsclaude IDE. Given a normalized AgentTree
 * from '@vsclaude/contracts', this package derives the pure data the swarm view
 * needs: a flat worker roster, the delegation threads between agents, aggregate
 * token and cost meters, and the layout mode to render. It holds no rendering
 * dependencies; the React or native integration is tracked in ROADMAP.md.
 */

export type { WorkerDescriptor } from './roster.js';
export { computeRoster, rosterDepth } from './roster.js';

export type { DelegationEdge } from './edges.js';
export { delegationEdges } from './edges.js';

export type { TokenAggregate } from './tokens.js';
export { aggregateTokens } from './tokens.js';

export type { SwarmLayout } from './layout.js';
export { chooseLayout, WORKSHOP_MAX, GRID_MAX } from './layout.js';
