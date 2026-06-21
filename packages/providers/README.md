# @vsclaude/providers

The provider layer for vsclaude. It owns the registry that maps provider ids to agent backend adapters, and the pure parser that turns Claude Code stream-json (NDJSON) output into the normalized `AgentEvent` stream that the rest of the IDE consumes. Everything here is dependency free pure TypeScript built on top of `@vsclaude/contracts`, so it runs unchanged in Node, a worker, or the browser.

## What lives here

- **`ProviderRegistry`**: a tiny synchronous registry with `register`, `upsert`, `get`, `has`, `unregister`, `list`, and `ids`. It is the single source of truth for which agent backends are available at runtime. Duplicate registration throws a `DuplicateProviderError` so wiring mistakes surface early.
- **`parseClaudeStreamLine`**: a one line in, one event out function that maps a single Claude Code stream-json line into an `AgentEvent`. It classifies tool calls (Edit and MultiEdit to `file_edit`, Write to `file_create`, Read to `file_open`, Bash to `command_run`, Grep and Glob to `search`, WebFetch to `web_fetch`, Task to `subagent_spawned`), promotes assistant text to `message` and thinking blocks to `thinking`, folds tool results into `tool_result`, and turns the final result line into `complete`. The raw JSON is always preserved on `event.raw`, plus a short human caption.
- **`ids` helpers**: `createCounter` and `makeEventId` keep event id allocation pure and deterministic, which makes parsing reproducible for snapshot tests and replay.

## Usage

```ts
import {
  createProviderRegistry,
  parseClaudeStreamLine,
  createCounter,
} from '@vsclaude/providers';

// Discover and register agent backends.
const registry = createProviderRegistry();
registry.register(claudeCodeAdapter);
const adapter = registry.get('claude-code');

// Normalize a stream of Claude Code NDJSON lines into AgentEvents.
const ctx = {
  sessionId: 'sess-1',
  agentId: 'agent-root',
  provider: 'claude-code' as const,
  counter: createCounter(),
};

for (const line of ndjsonChunk.split('\n')) {
  const event = parseClaudeStreamLine(line, ctx);
  if (event) {
    dispatch(event); // feed the pixie animation and timeline
  }
}
```

## Status

This is the initial logic layer: the registry and the Claude stream parser are real, tested, and dependency free. The live provider transports (spawning the Claude Code process, IPC streaming, reconnection) and any React or native integration are tracked in `ROADMAP.md` and land in a later pass. Nothing here imports a UI or heavy runtime library yet.
