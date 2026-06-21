# @vsclaude/agent-runtime

The session-state core of vsclaude. It turns the normalized `AgentEvent` stream described by `@vsclaude/contracts` into a live delegation `AgentTree`: who spawned whom, which workers are still running, and how many tokens each agent has burned. The swarm view, the mascot engine, and the chat panel all read this tree and nothing else, so the runtime is the single source of truth for "what is the agent doing right now."

## What lives here

- `reduceAgentTree(events)`: a pure, deterministic fold from an ordered `AgentEvent[]` to an `AgentTree`. It builds structure from `session_start`, `subagent_spawned`, and `subagent_finished`, and updates per-node status and token totals from `token_usage`, `complete`, and `error`. Replaying a log always yields the same tree.
- `SessionManager`: a thin stateful driver around the reducer. You feed it events with `ingest(event)` (or `ingestAll(events)`), read the current snapshot with `getTree()`, and react to changes via `subscribe(listener)`. It recomputes from the full log on every change, so streaming and cold replay are guaranteed identical, and it suppresses no-op notifications.
- `tree-utils`: small read helpers, namely `getRootNode`, `childrenOf`, `walkTree`, `countActiveAgents`, `totalTokenUsage`, and `isSessionComplete`.

Everything is pure TypeScript with no runtime dependencies beyond `@vsclaude/contracts`.

## Usage

```ts
import { createAgentEvent } from '@vsclaude/contracts';
import { SessionManager, totalTokenUsage } from '@vsclaude/agent-runtime';

const session = new SessionManager();

session.subscribe((tree) => {
  console.log('root:', tree.rootAgentId, 'agents:', Object.keys(tree.nodes).length);
});

session.ingest(
  createAgentEvent({ id: 'e1', sessionId: 's1', agentId: 'root', ts: 1, type: 'session_start', provider: 'claude-code', payload: {} }),
);
session.ingest(
  createAgentEvent({
    id: 'e2', sessionId: 's1', agentId: 'root', ts: 2,
    type: 'subagent_spawned', provider: 'claude-code',
    payload: { childAgentId: 'w1', task: 'write tests' },
  }),
);
session.ingest(
  createAgentEvent({
    id: 'e3', sessionId: 's1', agentId: 'w1', parentAgentId: 'root', ts: 3,
    type: 'token_usage', provider: 'claude-code',
    payload: { inputTokens: 300, outputTokens: 75 },
  }),
);

const tree = session.getTree();
console.log(tree.nodes['root']?.children); // ['w1']
console.log(totalTokenUsage(tree)); // { input: 300, output: 75 }
```

## Status

This is the initial logic layer: the pure reducer, the session manager, and the tree-walking utilities, all covered by Vitest. The React or native integration (wiring `SessionManager` into the renderer stores and the IPC transport) is tracked in `ROADMAP.md` and lands in a later milestone. The public surface here is intended to stay stable as that integration is built on top of it.
