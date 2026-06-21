# @vsclaude/contracts

> The frozen, versioned contracts that the whole product builds against.

This package is the keystone of vsclaude. It contains zero runtime dependencies
and zero UI. It defines the shared shapes that let a dozen packages and the
plugin ecosystem work together without ever reaching into each other's
internals.

If something is exported from here, it is a contract. Treat changes with care
and version them deliberately.

## What lives here

| Module | Purpose |
| --- | --- |
| `agent-event` | The normalized `AgentEvent`, the single event every provider maps into and the only thing the visual layer consumes. |
| `event-payloads` | Typed payload shapes per event type, plus the `AgentEventPayloadMap`. |
| `provider` | The `ProviderAdapter` contract every model backend implements. |
| `ipc` | The command and event protocol between the Tauri Rust core and the renderer. |
| `motion` | `PixieState`, `PixieMood`, `MotionDirective`, and the canonical `EVENT_TO_STATE` table. |
| `design-tokens` | The cozy pixel-craft token system and the bundled themes. |
| `plugin-api` | The public extensibility surface for community plugins. |
| `state` | Shared application state shapes (sessions, agent tree, settings, checkpoints). |
| `version` | The schema, IPC, and plugin API version constants. |

## The one idea

All providers normalize into a single `AgentEvent` stream. Everything visual
consumes only `AgentEvent`. Swap the provider, the whole experience just works.

```ts
import { createAgentEvent, EVENT_TO_STATE } from '@vsclaude/contracts';

const event = createAgentEvent({
  id: 'evt-1',
  sessionId: 's-1',
  agentId: 'root',
  ts: 1718900000000,
  type: 'file_edit',
  provider: 'claude-code',
  payload: { path: 'src/auth/login.ts', additions: 12, deletions: 3 },
  caption: 'Writing the login form.',
});

const pixieState = EVENT_TO_STATE[event.type]; // 'typing'
```

## The three sacred motion rules, encoded

1. Every animation is bound to a real event. `EVENT_TO_STATE` maps only real
   `AgentEventType` values to Pixie states.
2. Meaning is always recoverable. Every `AgentEvent` carries `raw`, the
   untouched provider event, and `MotionDirective` carries `sourceEventId`.
3. A non-technical person can follow along. Every event can carry a
   plain-language `caption`.

## Scripts

```bash
pnpm --filter @vsclaude/contracts build      # tsc project build to dist
pnpm --filter @vsclaude/contracts typecheck  # type check only
pnpm --filter @vsclaude/contracts test       # vitest unit tests
```

## Stability

The shapes here are versioned by `AGENT_EVENT_SCHEMA_VERSION`,
`IPC_PROTOCOL_VERSION`, and `PLUGIN_API_VERSION`. When a breaking change is
unavoidable, bump the relevant version, document the migration in the matching
spec under `specs/`, and announce it before dependent work resumes.
