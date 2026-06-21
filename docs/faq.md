# FAQ

vsclaude is a desktop IDE where you watch your AI coding agent work through living pixel-art animation instead of scrolling walls of text. A pixel-art companion named Pixie acts out exactly what the agent is doing, bound to real events, and one click always drills into the underlying detail. This FAQ answers the questions we hear most: cost, model support, keys, offline use, privacy, how we differ from VS Code and Cursor, performance impact, bug reporting, and plugin development. For deeper material, follow the cross-links to sibling specs.

## Table of contents

- [Is it free?](#is-it-free)
- [Which models are supported?](#which-models-are-supported)
- [Do I need an API key?](#do-i-need-an-api-key)
- [Does it work offline?](#does-it-work-offline)
- [Is my data private?](#is-my-data-private)
- [How is this different from VS Code or Cursor?](#how-is-this-different-from-vs-code-or-cursor)
- [Does the animation slow down my machine?](#does-the-animation-slow-down-my-machine)
- [How do I report a bug?](#how-do-i-report-a-bug)
- [How do I build a plugin?](#how-do-i-build-a-plugin)
- [Smaller questions](#smaller-questions)

---

## Is it free?

Yes. vsclaude is open source and free to download, run, and modify. There is no paid tier, no seat license, and no telemetry paywall gating features.

| What | Cost |
| --- | --- |
| The vsclaude app (all platforms) | Free, open source |
| Source code and plugin SDK | Free |
| Model usage | You pay your provider directly (bring your own key) |
| Local models via Ollama | Free, runs on your hardware |

The one cost you may incur is the cost charged by whichever cloud model provider you point vsclaude at. vsclaude never marks up or proxies that billing. Your Anthropic, OpenAI, or Google account is billed by them, at their rates, for the tokens your agent consumes. If you run everything locally through Ollama, there is no per-token cost at all.

We do not take a cut, run a relay, or insert ourselves between you and your provider. The app is a client and an orchestrator, not a billing intermediary.

---

## Which models are supported?

vsclaude runs Claude Code as a first-class citizen, and also supports Codex, Gemini, and local models through Ollama. The unifying idea is one event schema: every provider normalizes into a single `AgentEvent` stream, and everything visual consumes only `AgentEvent`. Each provider ships as a thin adapter, so adding a model family is a contained piece of work rather than a rewrite.

| Provider | Adapter status | How it runs | Notes |
| --- | --- | --- | --- |
| Claude Code | First-class | `claude -p --output-format stream-json --verbose`, or the Claude Agent SDK | The Task tool spawning a sub-agent becomes a `subagent_spawned` event, which makes the swarm view come alive automatically |
| Codex | Supported | Provider CLI / streaming API mapped per block | Normalized into `AgentEvent` |
| Gemini | Supported | Provider streaming API mapped per block | Normalized into `AgentEvent` |
| Ollama | Supported | Local HTTP endpoint, no key required | Fully offline once the model is pulled |

Because the contract is frozen and versioned, every visual surface (Pixie, the swarm view, captions, the detail drawer) works identically no matter which provider produced the event. The frozen contract lives in `packages/contracts/src/agent-event.ts`:

```ts
export type AgentEventType =
  | 'session_start' | 'session_end'
  | 'thinking' | 'message'
  | 'tool_call' | 'tool_result'
  | 'file_read' | 'file_edit' | 'file_create' | 'file_delete'
  | 'command_run' | 'command_output'
  | 'search' | 'web_fetch' | 'git_action'
  | 'subagent_spawned' | 'subagent_finished'
  | 'todo_update' | 'permission_request' | 'token_usage'
  | 'error' | 'complete';

export interface AgentEvent {
  id: string;
  sessionId: string;
  agentId: string;
  parentAgentId?: string;
  ts: number;
  type: AgentEventType;
  provider: 'claude-code' | 'codex' | 'gemini' | 'ollama' | string;
  schemaVersion: number;
  tool?: { name: string; input: unknown };
  payload?: Record<string, unknown>;
  caption?: string;
  raw?: unknown;
}
```

The `provider` field is typed as a union that ends in `string`, which is deliberate: third-party adapters can introduce new provider identifiers without forking the contract. See [How do I build a plugin?](#how-do-i-build-a-plugin) for writing your own adapter.

---

## Do I need an API key?

It depends on which model you choose.

- **Cloud providers (Claude, Codex, Gemini):** Yes. vsclaude is bring-your-own-key. You supply your own provider credential and you are billed directly by that provider.
- **Local models (Ollama):** No. Local inference runs against an Ollama endpoint on your machine and needs no key.

Keys are stored in the operating system keychain through the Rust core, never in plaintext config files and never in the renderer process. On macOS that is the Keychain, on Windows the Credential Manager, on Linux the Secret Service (libsecret). The frontend never sees the raw secret; it asks the Rust core to use it.

```text
React renderer  ──(IPC: "start session, provider=claude-code")──▶  Rust core
                                                                      │
                                                       reads secret from OS keychain
                                                                      │
                                                       spawns provider process / call
                                                                      ▼
                                                              AgentEvent stream
```

Practical rules:

1. The renderer requests an action by reference, never by passing the secret around.
2. The Rust core resolves the key from the keychain at the moment a session starts.
3. Secrets are never logged, never written to `claude-progress` style files, and never embedded in `AgentEvent.raw`.

If you only ever use Ollama, you can run vsclaude without entering any credential at all.

---

## Does it work offline?

Partly, and the boundary is clean.

| Capability | Works offline? |
| --- | --- |
| The IDE shell (editor, terminal, file tree, settings) | Yes |
| Pixie animation and the swarm view | Yes |
| Running a local model via Ollama | Yes |
| Reading and editing your local files | Yes |
| Running local commands in the terminal | Yes |
| Cloud models (Claude, Codex, Gemini) | No, they require a network connection |
| `web_fetch` tool events | No, fetching the web requires a network connection |
| Auto-update | No, it needs the release server |

In short: the application itself is a local desktop program built on Tauri with a Rust core, so the editor (Monaco), the terminal (xterm.js wired to a real PTY in Rust), and all motion run with no network at all. If your agent uses a local Ollama model, the entire loop is offline. The only things that need the internet are cloud model calls, web fetches the agent chooses to make, and checking for app updates.

---

## Is my data private?

Yes, by construction. vsclaude is a local-first desktop app. Your code, your prompts, and your agent output stay on your machine, except for the data you deliberately send to a cloud model provider.

What stays local:

- Your source files and edits.
- The full `AgentEvent` stream for a session, including `raw` payloads used by the detail drawer.
- Your settings and your keychain-stored credentials.
- Terminal input and output.

What leaves your machine, and only when you choose a cloud provider:

- The prompts and context your agent sends to that provider, governed by that provider's terms.
- Web requests the agent makes via the `web_fetch` tool.

What vsclaude itself sends home: nothing by default. There is no built-in analytics relay, no server that receives your events, and no proxy in the middle of your provider calls. Because we are open source, you can verify this in the adapter and IPC code rather than taking our word for it.

Two privacy details engineers should know:

1. **Secrets never touch the renderer.** As described above, keys live in the OS keychain and are resolved in the Rust core. A compromised web context cannot read them.
2. **`raw` is local.** The detail drawer can always recover the exact tool name, inputs, diff, command, and raw output because `AgentEvent.raw` is kept locally for the session. That fidelity is what makes the second sacred motion rule (meaning is always preserved and always recoverable) true, and it lives on your disk, not ours.

---

## How is this different from VS Code or Cursor?

VS Code and Cursor are excellent text-centric editors. vsclaude is a purpose-built IDE for watching an AI agent work, where the agent's activity is the primary surface, not a side panel of streaming text. Three things make it different.

**1. The agent is shown, not just printed.** Every animation is bound to a real event. When Pixie types, the agent is writing a file and you can see which file. Nothing is decorative theater. This is the first sacred motion rule, and it is enforced in the data flow: visuals consume only `AgentEvent`, so a frame on screen always corresponds to an event that actually happened.

**2. Any model behind one experience.** Claude Code is first-class, and Codex, Gemini, and Ollama plug in through thin adapters that normalize into the same `AgentEvent` stream. You learn one interface and use any model your key (or your local hardware) can reach.

**3. Truthful by construction with one-click drill-down.** Meaning is always preserved and always recoverable. One click on any animated moment opens the exact underlying detail: tool name, inputs, diff, command, raw output. And a non-technical person can follow along through plain-language captions, the third sacred motion rule.

A side-by-side view:

| Dimension | VS Code | Cursor | vsclaude |
| --- | --- | --- | --- |
| Primary surface | Text editor | Text editor with AI chat | Live agent activity (Pixie + swarm) |
| Agent visibility | Logs / chat text | Chat text and diffs | Animation bound to real events, one-click drill-down |
| Model choice | Via extensions | Mostly its own routing | Claude first-class, plus Codex, Gemini, Ollama via adapters |
| Sub-agent / swarm view | No | No | Yes, `subagent_spawned` drives the swarm automatically |
| Non-technical readability | No | Partial | Plain-language captions on every event |
| Editor and terminal | Monaco, integrated terminal | Monaco, integrated terminal | Monaco, xterm.js on a real Rust PTY |

vsclaude shares DNA with these tools (it uses Monaco, it has a real terminal) but it is built around a different thesis: an agent's work should be legible, alive, and always recoverable, for both engineers and the people looking over their shoulder. See [Architecture](./ARCHITECTURE.md) for how the event-driven core is wired.

---

## Does the animation slow down my machine?

No, and the design goes out of its way to prevent it. "Fast and light" is a product pillar, and the motion stack is layered so that the expensive paths only activate when they are needed.

How the motion stack is chosen:

| Layer | Tool | When it runs |
| --- | --- | --- |
| Pixie state machine | Rive (primary) | Always, lightweight pixel-art state machine |
| Sprite-sheet fallback | Custom animator | When Rive is unavailable |
| UI transitions | Motion (Framer Motion) | Standard panel and view transitions |
| Timeline choreography | GSAP | Coordinated multi-step sequences |
| Tiny accents | Lottie | Small accents only, never large scenes |
| Swarm canvas | PixiJS | Only when the DOM swarm view stalls |
| Sound | Tone.js | Optional, off by default |

The key performance ideas:

1. **Rive drives Pixie with a small set of inputs** (`state`, `mood`, `intensity`, `targetX`, `targetY`) rather than re-rendering heavy DOM on every event. `intensity` reflects how much is happening, so the visual cost scales with real activity rather than running hot constantly.
2. **PixiJS is a fallback, not the default.** The swarm view renders in the DOM until the DOM stalls, at which point it moves to a GPU-accelerated canvas. You pay the canvas cost only under load.
3. **Sound is off by default**, so Tone.js does nothing until you opt in.
4. **The terminal uses the xterm.js WebGL renderer** wired to a real PTY, which keeps high-throughput output smooth instead of thrashing the main thread.
5. **Accessibility and battery come first**: reduced-motion preferences are respected, dropping to calmer states and lower `intensity`.

If you do hit a slow machine or a degraded GPU, the fallback paths (sprite-sheet animator, lower intensity, reduced-motion mode) keep the app responsive. The motion never blocks the agent loop, because visuals are downstream consumers of `AgentEvent` and never sit on the critical path of running your code. See [Motion](./MOTION.md) for the full performance budget.

---

## How do I report a bug?

Open an issue on the repository. A good report turns a vague "Pixie looked wrong" into something an engineer can reproduce. Because every animation is bound to a real event, the most useful thing you can attach is the event context.

What to include:

1. **What you expected vs. what happened**, in one or two sentences.
2. **Which provider** you were running (`claude-code`, `codex`, `gemini`, `ollama`, or a custom one).
3. **The Pixie state and caption** at the moment of the problem (for example, `typing` with caption "Editing src/app.ts").
4. **The drill-down detail** from one click into the event: tool name, inputs, command, or diff. Redact anything sensitive first.
5. **OS and app version** (Help, then About shows the version and platform).
6. **Reproduction steps**, ideally minimal.

To capture the underlying event for a report, open the detail drawer on the affected moment and copy the structured event. It looks like this:

```json
{
  "id": "evt_8f2c",
  "sessionId": "sess_19a0",
  "agentId": "agent_root",
  "ts": 1718900000000,
  "type": "file_edit",
  "provider": "claude-code",
  "schemaVersion": 1,
  "tool": { "name": "edit_file", "input": { "path": "src/app.ts" } },
  "caption": "Editing src/app.ts"
}
```

Before filing:

- Search existing issues so you do not duplicate one.
- Strip secrets, tokens, and private code from anything you paste. Keys live in the keychain and should never appear in an event, but always double-check pasted `raw` payloads.
- If it is a crash, attach the app log location shown in Help, then Troubleshooting.

Security-sensitive reports (anything touching credentials, the keychain bridge, or remote code execution) should follow the responsible-disclosure path in [Security](./SECURITY.md) rather than a public issue.

---

## How do I build a plugin?

vsclaude is open and extensible by design. The most common plugin is a **provider adapter**: a thin module that runs some agent and maps its output into the frozen `AgentEvent` contract. Once your adapter emits valid `AgentEvent`s, every visual surface (Pixie, swarm, captions, drill-down) works for free, because everything visual consumes only `AgentEvent`.

### The contract you build against

Your adapter's only job is to turn provider-native output into `AgentEvent`s. The shape is frozen and versioned (see [Which models are supported?](#which-models-are-supported) for the full type). The two rules that make a plugin "good":

1. **Bind every event to something real.** If you emit a `file_edit`, the agent must actually be editing a file, and `tool.input` must name it. This upholds the first sacred motion rule.
2. **Preserve recoverable meaning.** Put the exact underlying detail in `tool` and `raw` so the detail drawer can drill in. Write a plain-language `caption` so a non-technical person can follow along. These uphold the second and third rules.

### Minimal adapter skeleton

The monorepo uses pnpm workspaces; packages live under `packages/*`. A provider adapter is a package that exports a stream of `AgentEvent`s.

```ts
// packages/adapter-myprovider/src/index.ts
import type { AgentEvent } from '@vsclaude/contracts';

const SCHEMA_VERSION = 1;

export async function* runMyProvider(
  sessionId: string,
): AsyncGenerator<AgentEvent> {
  const proc = spawnMyProviderProcess(); // your CLI or SDK call

  yield {
    id: crypto.randomUUID(),
    sessionId,
    agentId: 'agent_root',
    ts: Date.now(),
    type: 'session_start',
    provider: 'myprovider',
    schemaVersion: SCHEMA_VERSION,
    caption: 'Starting session',
  };

  for await (const block of proc.stream()) {
    const event = mapBlockToEvent(block, sessionId);
    if (event) yield event;
  }
}

function mapBlockToEvent(
  block: ProviderBlock,
  sessionId: string,
): AgentEvent | null {
  switch (block.kind) {
    case 'edit':
      return {
        id: crypto.randomUUID(),
        sessionId,
        agentId: 'agent_root',
        ts: Date.now(),
        type: 'file_edit',
        provider: 'myprovider',
        schemaVersion: SCHEMA_VERSION,
        tool: { name: 'edit_file', input: { path: block.path } },
        caption: `Editing ${block.path}`,
        raw: block,
      };
    // map thinking, command_run, search, subagent_spawned, complete, ...
    default:
      return null;
  }
}
```

### Mapping checklist

Map as many event types as your provider exposes. The high-value ones for a lively experience:

| You emit | Pixie shows | Why it matters |
| --- | --- | --- |
| `thinking` | thinking | The agent is reasoning |
| `todo_update` | planning | The plan is taking shape |
| `file_read` | reading | Drives the reading state |
| `file_edit` / `file_create` | typing | Pixie types the real file |
| `search` | searching | Code or doc search |
| `web_fetch` | web | Network reach-out |
| `command_run` | running | Terminal execution |
| `error` during a run | debugging / confused | Surfaces failures honestly |
| `subagent_spawned` | spawning | Makes the swarm view come alive automatically |
| `permission_request` | waiting | Pauses for the human |
| `complete` | success | Ends on a clear win |

### Quality gates for a plugin

Plugins are held to the same bar as the core. Before you publish:

- **TypeScript strict.** No `any` in your public surface, explicit return types.
- **Tests with Vitest.** Unit-test your `mapBlockToEvent` against recorded provider output.
- **Storybook coverage.** If your plugin adds UI, add a story; the project keeps a story for every Pixie state, and contributions follow suit.
- **Lint and format.** ESLint and Prettier must pass.
- **Versioning with Changesets.** Bump the contract `schemaVersion` only when the frozen contract itself changes, which is a coordinated, rare event.

### Beyond adapters

Provider adapters are the canonical extension point, but the same open architecture allows UI panels, custom captions, and additional tool visualizations, all consuming the same `AgentEvent` stream. Start from the contract, keep your events truthful, and the rest of the app does the heavy lifting. See [Plugins](./PLUGINS.md) and [Architecture](./ARCHITECTURE.md) for the extension surface in full.

---

## Smaller questions

**What platforms does it run on?**
Desktop: macOS, Windows, and Linux, built on Tauri 2.x with a Rust core. Electron is a fallback only.

**What do I need to build it from source?**
Node with pnpm (the chosen package manager), and the Rust toolchain (rustup, cargo, and a platform linker, plus the MSVC build tools on Windows). See [Build](./BUILD.md) for the full setup.

**Can a non-technical person actually follow along?**
Yes. Every event carries a plain-language caption, and Pixie acts the action out. That is a hard requirement, not a nice-to-have.

**Is sound on by default?**
No. Tone.js is optional and off by default.

**Where are my keys stored?**
In the OS keychain, resolved in the Rust core, never in the renderer. See [Do I need an API key?](#do-i-need-an-api-key).

**Can I add a model the project does not ship?**
Yes, write a provider adapter. The `provider` field accepts custom identifiers. See [How do I build a plugin?](#how-do-i-build-a-plugin).
