# @vsclaude/swarm

Orchestration view model for the vsclaude IDE. Given a normalized `AgentTree` from `@vsclaude/contracts`, this package derives the pure, render-ready data that the swarm view needs to show many agents working at once: a flat worker roster, the delegation threads that connect parents to the workers they spawned, aggregate token and cost meters for the whole run, and the layout mode best suited to the current worker count. It is dependency-free domain logic with no rendering engine attached.

## What lives here

- `computeRoster(tree)`: flattens the agent tree into an ordered array of `WorkerDescriptor` records (`agentId`, `task`, `status`, `depth`, `parent`) using a stable pre-order walk.
- `delegationEdges(tree)`: returns `{ from, to }` edges for every parent-child link, ready for drawing animated delegation threads.
- `aggregateTokens(tree)`: sums `input`, `output`, and `costUsd` across every node into a single `TokenAggregate`.
- `chooseLayout(count)`: maps a worker count to `'workshop'`, `'grid'`, or `'roster'` using documented thresholds (`WORKSHOP_MAX = 6`, `GRID_MAX = 24`).
- Helpers: `rosterDepth(roster)` reports the deepest level present.

## Usage

```ts
import {
  computeRoster,
  delegationEdges,
  aggregateTokens,
  chooseLayout,
} from '@vsclaude/swarm';
import type { AgentTree } from '@vsclaude/contracts';

function buildSwarmView(tree: AgentTree) {
  const roster = computeRoster(tree);
  const edges = delegationEdges(tree);
  const meters = aggregateTokens(tree);
  const layout = chooseLayout(roster.length);

  return { roster, edges, meters, layout };
  // layout is 'workshop' for cozy small swarms, 'grid' as it grows,
  // and 'roster' once the swarm is large.
}
```

## Status

This is the initial logic layer: pure, tested view-model functions over the
agent tree. The React or native integration that turns this data into the
pixel-art orchestration scene is tracked in `ROADMAP.md`.
