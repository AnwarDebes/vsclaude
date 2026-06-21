# TECH_STACK

This document is the canonical record of every technology choice in vsclaude, the reasoning behind each one, and the explicit swaps we made from earlier plans. vsclaude is a cozy, purpose-built desktop IDE where a developer watches an AI coding agent work through living pixel-art animation (Pixie) instead of scrolling walls of text, with Claude Code as a first-class citizen alongside Codex, Gemini, and local models via Ollama. Every choice below serves the product pillars: usability above all, alive and cozy, truthful by construction, any model your key, fast and light, open and extensible, and accessible. Treat this as a contract: if you are adding a dependency or proposing a swap, it belongs here with a rationale before it lands in `package.json` or `Cargo.toml`.

## Table of contents

- [1. Decision principles](#1-decision-principles)
- [2. Stack at a glance](#2-stack-at-a-glance)
- [3. Desktop shell: Tauri 2.x over Electron](#3-desktop-shell-tauri-2x-over-electron)
- [4. Rust core responsibilities](#4-rust-core-responsibilities)
- [5. Frontend runtime: React 19 + TypeScript strict + Vite](#5-frontend-runtime-react-19--typescript-strict--vite)
- [6. State: Zustand (with Jotai for motion atoms) and TanStack Query](#6-state-zustand-with-jotai-for-motion-atoms-and-tanstack-query)
- [7. Editor and terminal: Monaco and xterm.js WebGL](#7-editor-and-terminal-monaco-and-xtermjs-webgl)
- [8. Motion stack: Rive primary, sprite-sheet fallback, and friends](#8-motion-stack-rive-primary-sprite-sheet-fallback-and-friends)
- [9. Styling: Tailwind CSS v4 and design tokens](#9-styling-tailwind-css-v4-and-design-tokens)
- [10. Monorepo and package manager: pnpm workspaces over npm](#10-monorepo-and-package-manager-pnpm-workspaces-over-npm)
- [11. Quality tooling](#11-quality-tooling)
- [12. The unifying contract: AgentEvent](#12-the-unifying-contract-agentevent)
- [13. Prerequisite: the Rust toolchain](#13-prerequisite-the-rust-toolchain)
- [14. Full dependency table](#14-full-dependency-table)
- [15. Git identity: GitHub noreply for single-author commits](#15-git-identity-github-noreply-for-single-author-commits)
- [16. Swaps from the original plan](#16-swaps-from-the-original-plan)
- [17. Open questions and future swaps](#17-open-questions-and-future-swaps)

## 1. Decision principles

Every technology in vsclaude is selected against four filters, in priority order:

1. **Truthful by construction.** The tech must let us bind animation to real events and keep the underlying detail one click away. Anything that encourages fake or decorative state is rejected.
2. **Fast and light.** This is a companion that runs all day next to a coding agent. Memory footprint, cold start, and idle CPU matter as much as feature breadth.
3. **Open and extensible.** Permissive licenses, stable plugin or adapter seams, and the ability for a contributor to add a new provider without forking core.
4. **Boring where it counts.** For load-bearing surfaces (editor, terminal, state) we pick the option with the deepest production track record, and we spend our novelty budget only where it differentiates: the motion layer.

## 2. Stack at a glance

| Layer | Choice | Status |
| --- | --- | --- |
| Desktop shell | Tauri 2.x (Rust core, system WebView) | Locked |
| Fallback shell | Electron | Fallback only |
| Native core | Rust | Locked |
| UI framework | React 19 | Locked |
| Language | TypeScript (strict) | Locked |
| Bundler / dev server | Vite | Locked |
| App state | Zustand | Locked |
| Fine-grained motion atoms | Jotai | Allowed alongside Zustand |
| Async / cache | TanStack Query | Locked |
| Code editor | Monaco | Locked |
| Terminal | xterm.js with WebGL renderer | Locked |
| Primary motion | Rive | Locked |
| Motion fallback | Sprite-sheet animator (in-house) | Locked |
| UI transitions | Motion (Framer Motion) | Locked |
| Timeline choreography | GSAP | Locked |
| Tiny accents | Lottie | Locked, scoped |
| Swarm canvas (DOM stall path) | PixiJS | Conditional |
| Sound | Tone.js | Optional, off by default |
| Styling | Tailwind CSS v4 + CSS variable tokens | Locked |
| Monorepo | pnpm workspaces | Locked |
| Versioning | Changesets | Locked |
| Lint / format | ESLint + Prettier | Locked |
| Unit tests | Vitest | Locked |
| E2E tests | Playwright | Locked |
| Rust tests | cargo test | Locked |
| Component / state catalog | Storybook | Locked |

See [Architecture](./ARCHITECTURE.md) for how these layers connect at runtime, and [Motion System](./MOTION_SYSTEM.md) for the Pixie state machine in detail.

## 3. Desktop shell: Tauri 2.x over Electron

Tauri 2.x is the shell. The Rust core owns process and PTY lifecycle, filesystem watching, OS keychain secret storage, the IPC bridge to the WebView, and auto-update. Electron remains a documented fallback only, used if a target platform exposes a WebView we cannot ship against.

### Why Tauri wins for this product

| Dimension | Tauri 2.x | Electron | Why it matters here |
| --- | --- | --- | --- |
| Binary size | Tens of MB | 150 MB+ baseline | "Fast and light" pillar. A companion app should not feel like a second IDE on disk. |
| Idle memory | Lower (system WebView, no bundled Chromium) | Higher (bundled Chromium per app) | The app runs all day beside an agent and the user's real editor. |
| Native core language | Rust | Node.js (main process) | PTY, file watching, and keychain access are systems work. Rust gives us memory safety and first-class libraries (`portable-pty`, `notify`, `keyring`). |
| Secret storage | OS keychain via Rust (`keyring`) | Possible but commonly rolled ad hoc | "Bring your own key" demands secrets never touch disk in plaintext. |
| Security posture | Capability-scoped IPC, no Node in the WebView by default | Full Node in renderer unless hardened | Smaller attack surface for an app that spawns processes and holds API keys. |
| Auto-update | Built-in updater with signature verification | Available via electron-updater | We need signed, reliable updates from day one. |

The cost of Tauri is the system WebView fragmentation problem: WebView2 on Windows, WKWebView on macOS, WebKitGTK on Linux. We accept this and mitigate it with a strict browser support matrix, Playwright runs against the real WebView per platform, and a hard rule that no feature depends on a Chromium-only API. Where a capability is missing on one WebView, we feature-detect and degrade, never assume Chromium.

### Why we keep Electron as a labeled fallback

If a future platform target ships a WebView too old to run React 19 plus our WebGL terminal, Electron's bundled Chromium guarantees a known-good engine. We do not build on Electron speculatively. The fallback is a contingency, and any code path that assumes Electron must be guarded and documented.

```text
+-------------------------------------------------------------+
|                      Tauri application                      |
|                                                             |
|  +----------------------+        +------------------------+ |
|  |   System WebView     |  IPC   |      Rust core         | |
|  |  React 19 + TS UI    |<------>|  PTY, FS watch, keychain| |
|  |  Pixie / Monaco /    |        |  process lifecycle,    | |
|  |  xterm WebGL         |        |  auto-update, adapters | |
|  +----------------------+        +------------------------+ |
+-------------------------------------------------------------+
```

## 4. Rust core responsibilities

The Rust core is not a thin wrapper. It is where the truthful event stream originates. Its responsibilities:

- **Process and PTY lifecycle.** Spawn provider CLIs (for example `claude -p --output-format stream-json --verbose`), own their stdout, stderr, and PTY, and forward bytes to the frontend. Clean teardown on session end.
- **Filesystem watching.** Use `notify` to observe the workspace so `file_read`, `file_edit`, `file_create`, and `file_delete` events can be corroborated against real disk activity.
- **OS keychain secret storage.** Use `keyring` so API keys live in the platform credential store, never in app config files.
- **IPC bridge.** Expose Tauri commands and an event channel that carry normalized `AgentEvent` values to the WebView. The frontend consumes only `AgentEvent`.
- **Auto-update.** Signed update checks and apply flow.

Provider adapters can live partly in Rust (process management, raw stream capture) and partly in TypeScript (block-to-event mapping), but the rule is invariant: every visual consumes only `AgentEvent`, so wherever an adapter lives it must emit that shape. See [Providers](./PROVIDERS.md).

## 5. Frontend runtime: React 19 + TypeScript strict + Vite

- **React 19.** The view layer. We use React for its ecosystem depth (Monaco, xterm, Rive, Motion all have first-class React bindings) and for concurrent rendering, which keeps the UI responsive while a high-frequency `AgentEvent` stream updates the swarm and captions. We lean on the modern hooks model and Suspense for data boundaries via TanStack Query.
- **TypeScript strict.** Non-negotiable. The entire app is built against the frozen `AgentEvent` contract, and strict mode plus discriminated unions on `AgentEventType` make illegal states unrepresentable at compile time. No implicit `any`. No unchecked event shapes.
- **Vite.** Dev server and bundler. Chosen for instant HMR (critical when iterating on Pixie states and captions), native ESM, and a clean Tauri integration. Vite is the de facto standard for React 19 plus TypeScript and pairs cleanly with Vitest, which shares its transform pipeline so test and app behavior stay aligned.

## 6. State: Zustand (with Jotai for motion atoms) and TanStack Query

### Zustand for app state

Zustand is the primary store. We chose it over Redux Toolkit and over Context-only patterns for three reasons:

1. **Minimal boilerplate, maximal control.** A trading-grade event stream needs surgical updates. Zustand lets us update a slice without re-rendering subscribers that do not depend on it, using selector subscriptions.
2. **Lives outside React.** The Rust IPC listener can push events into the Zustand store imperatively, decoupled from the React render cycle, which matters under bursty event load.
3. **Tiny and unopinionated.** It does not impose a reducer ceremony, which keeps the "fast and light" promise and keeps the store readable.

```ts
import { create } from 'zustand';
import type { AgentEvent } from '@vsclaude/contracts';

interface SessionState {
  events: AgentEvent[];
  append: (e: AgentEvent) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  events: [],
  append: (e) => set((s) => ({ events: [...s.events, e] })),
  reset: () => set({ events: [] }),
}));
```

### Jotai for fine-grained motion atoms

Where Zustand models coarse app state (sessions, panels, the event log), Jotai is allowed for fine-grained, high-churn motion values: Pixie's `targetX`, `targetY`, `intensity`, and per-swarm-member positions. Atomic, bottom-up state suits values that change every frame and are read by a single animated node, avoiding store-wide notification churn. Use Jotai only for motion-adjacent atoms; do not duplicate app state there.

### TanStack Query for async and cached data

TanStack Query owns all async and cached data that is not the live event stream: provider model lists, file tree snapshots, git status, settings reads, and any HTTP fetch. It gives us caching, deduplication, background refetch, and request lifecycle states (loading, error, success) for free, so we never hand-roll fetch state. The live `AgentEvent` stream is push-based and stays in Zustand; request-response data stays in TanStack Query. This split keeps each tool doing what it is best at.

## 7. Editor and terminal: Monaco and xterm.js WebGL

### Monaco

Monaco is the editor, the same engine that powers VS Code. We pick it because:

- It is the proven, accessible, feature-complete code editor for the web platform: syntax highlighting, multi-cursor, find and replace, and a diff editor we reuse to show the exact `file_edit` diff when the user drills into a Pixie typing animation.
- Its diff view directly serves Sacred Motion Rule 2 (meaning is recoverable): clicking a `file_edit` event opens the real before-and-after.
- Users coming from VS Code feel at home immediately, which serves usability above all.

The trade-off is bundle weight. We mitigate with lazy loading: Monaco is dynamically imported only when the editor surface mounts, and only the language workers in use are loaded.

### xterm.js with the WebGL renderer

The terminal is xterm.js with the WebGL renderer, wired to a real PTY in the Rust core.

- **Real PTY, not a fake shell.** Truthful by construction: when a `command_run` event fires and Pixie enters the `running` state, the bytes on screen are the genuine process output streaming from the Rust-owned PTY.
- **WebGL renderer.** The DOM renderer cannot keep up with high-throughput output (large builds, verbose logs). The WebGL renderer batches glyph rendering on the GPU, which keeps the `running` and `building` states smooth without dropping frames or stalling the swarm.
- Fallback: if a WebView lacks usable WebGL, xterm.js falls back to the canvas or DOM renderer automatically, and we feature-detect to avoid a hard failure.

## 8. Motion stack: Rive primary, sprite-sheet fallback, and friends

The motion layer is where vsclaude spends its novelty budget, because animation bound to real events is the product. Each tool has a narrow, justified role.

| Tool | Role | Why it, why scoped here |
| --- | --- | --- |
| **Rive** | Primary Pixie renderer. A pixel-art state machine driven by inputs `state`, `mood`, `intensity`, `targetX`, `targetY`. | Rive's state machine maps one-to-one onto Pixie states with idle, entry, and exit blends, and moods (calm, focused, excited, struggling) layer on top. Runtime is tiny, GPU-accelerated, and designer-editable without code. This is the cleanest way to bind animation to `AgentEvent` types. |
| **Sprite-sheet fallback animator** | In-house fallback that plays the same Pixie states from sprite sheets when Rive is unavailable or disabled. | Guarantees Pixie still acts truthfully on constrained WebViews or reduced-capability environments. Same state vocabulary, simpler renderer. Keeps the product functional everywhere. |
| **Motion (Framer Motion)** | UI transitions: panels, drawers, list enter and exit, layout shifts. | Declarative, React-native, excellent for component-level transitions. Not used for Pixie itself. |
| **GSAP** | Timeline choreography for multi-step, sequenced motion (for example a coordinated swarm reaction to `subagent_spawned`). | Best-in-class timeline control where Motion's per-component model is awkward. |
| **Lottie** | Tiny accents only (small celebratory or status flourishes). | Strictly scoped. Not a Pixie renderer and not for anything load-bearing. Overuse bloats bundles. |
| **PixiJS** | The swarm canvas, used only if the DOM-based swarm stalls under many concurrent sub-agents. | WebGL 2D renderer that scales to many animated nodes. Conditional: we prefer DOM and Rive until measured stalls justify Pixi. |
| **Tone.js** | Optional sound, off by default. | Audio feedback bound to events for users who opt in. Off by default to respect focus and accessibility. |

The mapping from `AgentEventType` to Pixie state is fixed and lives in the motion layer:

```ts
// Illustrative mapping; the authoritative version lives in the motion package.
const EVENT_TO_PIXIE: Record<string, PixieState> = {
  session_start: 'greeting',
  thinking: 'thinking',
  todo_update: 'planning',
  file_read: 'reading',
  file_edit: 'typing',
  file_create: 'typing',
  search: 'searching',
  web_fetch: 'web',
  command_run: 'running',
  error: 'debugging',      // 'confused' when unresolved
  git_action: 'git',
  subagent_spawned: 'spawning',
  permission_request: 'waiting',
  complete: 'success',
};
```

See [Motion System](./MOTION_SYSTEM.md) for blends, mood layering, intensity scaling, and the full state list.

## 9. Styling: Tailwind CSS v4 and design tokens

Styling is Tailwind CSS v4 with a token-driven design system built on CSS variables.

- **Tailwind v4** for utility-first speed and a small, purged output. v4's CSS-first configuration and native CSS variable support fit our token approach without a heavy JavaScript config layer.
- **CSS variable tokens** define the cozy visual language (colors, spacing, radii, motion timing) in one place so theming and accessibility contrast adjustments are a token change, not a sweep through components.

This keeps the "alive and cozy" and "accessible" pillars expressible in a single token sheet rather than scattered class soup. See [Design System](./DESIGN_SYSTEM.md).

## 10. Monorepo and package manager: pnpm workspaces over npm

The repository is a pnpm workspaces monorepo. Packages live under `packages/*` and the Tauri app under `apps/desktop`.

```text
vsclaude/
  apps/
    desktop/            # Tauri app (Rust core + React UI)
  packages/
    contracts/          # frozen AgentEvent schema, shared types
    motion/             # Pixie states, Rive bindings, sprite fallback
    adapters/           # provider adapters (claude-code, codex, gemini, ollama)
    ui/                 # shared React components + Storybook
  pnpm-workspace.yaml
```

### Why pnpm over npm

| Dimension | pnpm | npm | Why it matters |
| --- | --- | --- | --- |
| Disk usage | Content-addressed global store, hard-linked | Per-project duplication | A monorepo with many packages stays light; one copy of each dependency version on disk. |
| Install speed | Faster on cold and warm caches | Slower | Faster CI and faster contributor onboarding. |
| Strictness | Non-flat `node_modules`, no phantom deps | Hoists, allows phantom deps | A package can only import what it declares. This prevents accidental coupling across our workspace boundaries. |
| Workspace ergonomics | First-class `workspace:` protocol, filtering | Workspaces exist but less ergonomic | Clean internal version pinning and targeted scripts (`pnpm --filter`). |

The strictness point is the decisive one: with our frozen `contracts` package shared across adapters, motion, and UI, we cannot afford phantom dependencies that compile by accident and break in another package. pnpm makes the dependency graph honest, which mirrors the product's own "truthful by construction" value at the build level.

Versioning across the workspace is managed with **Changesets**, which produces changelogs and coordinated version bumps for the published packages.

## 11. Quality tooling

| Concern | Tool | Notes |
| --- | --- | --- |
| Lint | ESLint | TypeScript-aware rules, enforced in CI. |
| Format | Prettier | Single source of formatting truth, no debates. |
| Types | TypeScript strict | The compiler is a gate, not a suggestion. |
| Unit tests | Vitest | Shares Vite's transform pipeline, fast watch mode. |
| E2E tests | Playwright | Runs against the real WebView per platform. |
| Rust tests | cargo test | Covers the core: PTY, FS watch, keychain, adapters. |
| Component catalog | Storybook | Every Pixie state and every shared component has a story. |
| Versioning | Changesets | Coordinated releases across the workspace. |

Storybook carries a specific mandate here: every Pixie state (greeting, idle, sleeping, thinking, planning, reading, typing, searching, web, running, debugging, building, git, spawning, waiting, success, confused) gets a story so designers and engineers can review motion in isolation, with mood and intensity controls, decoupled from a live agent run.

## 12. The unifying contract: AgentEvent

The reason this stack holds together is a single frozen event schema. All providers normalize into one `AgentEvent` stream and every visual consumes only `AgentEvent`. Each provider has a thin adapter; the Claude Code adapter runs the agent in streaming mode and maps each block, so the Task tool spawning a sub-agent becomes a `subagent_spawned` event and the swarm view comes alive automatically.

```ts
// packages/contracts/src/agent-event.ts  (frozen, versioned)
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

Two stack-level consequences follow from this contract:

- The `raw` field is what makes Sacred Motion Rule 2 enforceable: one click drills from any animation into the exact tool name, inputs, diff, command, or raw output. Every adapter must populate it.
- The `caption` field is what makes Sacred Motion Rule 3 enforceable: a non-technical viewer follows along in plain language. Adapters generate captions; the UI never invents them.

See [Contracts](./CONTRACTS.md) and [Providers](./PROVIDERS.md).

## 13. Prerequisite: the Rust toolchain

Because the shell is Tauri with a Rust core, the Rust toolchain is a documented setup prerequisite for any contributor who builds the desktop app. The frontend packages alone do not require it, but `apps/desktop` does.

Required:

- **rustup** (the toolchain manager) and **cargo** (build and test).
- A **platform linker and build tools**:
  - Windows: the **MSVC build tools** (Visual Studio Build Tools with the C++ workload) plus WebView2 runtime.
  - macOS: the Xcode command line tools.
  - Linux: the standard C toolchain plus WebKitGTK development packages.

```bash
# Install rustup (Unix-like); on Windows use the rustup-init.exe installer.
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Verify the toolchain.
rustc --version
cargo --version

# Run the Rust core tests.
cargo test
```

This prerequisite is intentional. The PTY, filesystem watching, and keychain integration that make events truthful cannot be done from the WebView alone, so Rust is load-bearing, not optional. See [Build and Release](./BUILD_AND_RELEASE.md) for the full per-platform setup.

## 14. Full dependency table

Versions are tracked in the lockfile; this table records purpose and rationale. Entries marked Rust are crates in the core, the rest are workspace npm packages.

| Package | Layer | Purpose | Why this one |
| --- | --- | --- | --- |
| `@tauri-apps/api`, Tauri (Rust) | Shell | Desktop runtime, IPC, updater, secure storage | Small, secure, Rust-backed shell. See section 3. |
| `react`, `react-dom` | UI | View layer | Deep ecosystem, concurrent rendering for bursty event streams. |
| `typescript` | Language | Static types in strict mode | Makes the `AgentEvent` contract enforceable at compile time. |
| `vite` | Build | Dev server and bundler | Instant HMR, native ESM, clean Tauri and Vitest integration. |
| `zustand` | State | Coarse app state, IPC sink | Minimal, selector-based, lives outside React. See section 6. |
| `jotai` | State | Fine-grained motion atoms | Atomic state for per-frame motion values without store-wide churn. |
| `@tanstack/react-query` | Data | Async fetch, cache, request lifecycle | Caching, dedup, background refetch for request-response data. |
| `monaco-editor` | Editor | Code editing and diff view | VS Code engine, diff view backs `file_edit` drill-down. |
| `@xterm/xterm` | Terminal | Terminal emulator | Standard web terminal, real PTY, truthful command output. |
| `@xterm/addon-webgl` | Terminal | GPU-accelerated rendering | Keeps high-throughput output smooth in `running` and `building`. |
| `@rive-app/react-canvas` | Motion | Primary Pixie state machine | State machine maps to Pixie states with blends and moods. |
| In-house sprite animator | Motion | Fallback Pixie renderer | Same state vocabulary when Rive is unavailable. |
| `motion` (Framer Motion) | Motion | UI transitions | Declarative React-native component transitions. |
| `gsap` | Motion | Timeline choreography | Sequenced multi-step motion (swarm reactions). |
| `lottie-web` | Motion | Tiny accents only | Scoped to small flourishes, never Pixie. |
| `pixi.js` | Motion | Swarm canvas (conditional) | WebGL 2D scale path if the DOM swarm stalls. |
| `tone` | Audio | Optional event-bound sound | Opt-in, off by default for focus and accessibility. |
| `tailwindcss` (v4) | Styling | Utility-first styling | CSS-first config, native CSS variables, small output. |
| `eslint` | Quality | Linting | TypeScript-aware rules, CI gate. |
| `prettier` | Quality | Formatting | One formatting source of truth. |
| `vitest` | Testing | Unit tests | Shares Vite pipeline, fast watch. |
| `@playwright/test` | Testing | End-to-end tests | Runs against the real WebView per platform. |
| `@storybook/react` | Tooling | Component and Pixie state catalog | A story per Pixie state and shared component. |
| `@changesets/cli` | Release | Versioning and changelogs | Coordinated workspace releases. |
| `notify` (Rust) | Core | Filesystem watching | Corroborates file events against real disk activity. |
| `portable-pty` (Rust) | Core | PTY management | Real pseudo-terminal for truthful command output. |
| `keyring` (Rust) | Core | OS keychain access | API keys in the platform credential store, not on disk. |
| `tokio` (Rust) | Core | Async runtime | Concurrent process, PTY, and IPC handling. |
| `serde`, `serde_json` (Rust) | Core | Serialization | Encode `AgentEvent` across the IPC bridge. |

## 15. Git identity: GitHub noreply for single-author commits

vsclaude is authored and released as single-author work in its current phase, and all commits use the GitHub noreply identity.

### The decision

- Commits are made under the maintainer's **GitHub-provided noreply email** of the form `<id>+<username>@users.noreply.github.com`, not a personal email address.
- This is the configured `user.email` for the repository, so every commit links to the GitHub account without exposing a private address.

### Why noreply

| Reason | Detail |
| --- | --- |
| Privacy | The maintainer's real email never lands in the public git history, where it would be permanently scrapeable. |
| Attribution intact | GitHub still maps the noreply address to the account, so the contribution graph, profile links, and commit authorship all resolve correctly. |
| Single-author clarity | With one author, there is no co-author footer and no shared identity to reconcile. Every commit is unambiguously the maintainer's. |
| Reversible later | If the project moves to multi-author, we add co-author trailers per commit. The noreply base identity stays valid and needs no rewrite. |

### Configuration

```bash
# Per-repository identity using the GitHub noreply address.
git config user.name "Maintainer Name"
git config user.email "<id>+<username>@users.noreply.github.com"
```

Because this phase is single-author, commits carry no `Co-Authored-By` trailer. When that changes, this section is the place to record the new policy.

## 16. Swaps from the original plan

This section is the audit trail of changes from earlier drafts so reviewers can see what moved and why.

| From | To | Reason |
| --- | --- | --- |
| Electron as the shell | Tauri 2.x, Electron demoted to fallback | Size, idle memory, Rust core for PTY and keychain, and a smaller security surface for an app that holds API keys and spawns processes. |
| npm workspaces | pnpm workspaces | Disk efficiency via the content-addressed store, faster installs, and strict non-flat `node_modules` that eliminates phantom dependencies across our shared `contracts` boundary. |
| Redux-style global store (considered) | Zustand for app state, Jotai for motion atoms | Less boilerplate, selector-based updates, store that lives outside React for the IPC sink, and atomic state for per-frame motion values. |
| Single animation library (considered) | Rive primary with an in-house sprite-sheet fallback | A pixel-art state machine maps cleanly onto Pixie states with blends and moods, while the fallback guarantees truthful motion on constrained WebViews. |
| DOM-only terminal rendering | xterm.js with the WebGL renderer | The DOM renderer stalls under high-throughput build output; WebGL keeps the `running` and `building` states smooth. |
| Personal-email commits (considered) | GitHub noreply identity | Keeps the maintainer's address out of public history while preserving GitHub attribution. |

## 17. Open questions and future swaps

These are not decided. They are tracked so a future change has a home.

- **PixiJS activation threshold.** We have not fixed the concurrent-sub-agent count at which the DOM swarm yields to the Pixi canvas. This should be measured, not guessed, against the real `subagent_spawned` load.
- **Sound design scope.** Tone.js is wired but off by default. Whether sound graduates from opt-in to a richer, event-mapped layer depends on accessibility review.
- **Adapter placement.** The split of each provider adapter between Rust (stream capture) and TypeScript (block mapping) may shift toward Rust for performance as the event volume grows. The invariant stays: the frontend consumes only `AgentEvent`.

For how these pieces assemble at runtime, continue to [Architecture](./ARCHITECTURE.md). For the event contract itself, see [Contracts](./CONTRACTS.md). For the Pixie state machine, see [Motion System](./MOTION_SYSTEM.md).
