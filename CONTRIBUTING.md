# Contributing to vsclaude

vsclaude is a cozy, beautiful, purpose-built IDE where a developer watches their AI coding agent work through living pixel-art animation instead of scrolling walls of text. This guide explains how to set up the development environment, how the repository is laid out, the rules you must follow when changing code, and the exact steps to add a Pixie state, a theme, or a model provider. Read it fully before opening your first pull request. Everything here is enforced by CI, so following it saves you a round trip.

## Table of Contents

1. [Before You Start](#before-you-start)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Repository Layout](#repository-layout)
5. [The Contracts-First Rule](#the-contracts-first-rule)
6. [Daily Development Workflow](#daily-development-workflow)
7. [Code Style](#code-style)
8. [Commit Conventions](#commit-conventions)
9. [Branch Naming](#branch-naming)
10. [Pull Request Process](#pull-request-process)
11. [CI Checks That Must Pass](#ci-checks-that-must-pass)
12. [How to Add a Pixie State](#how-to-add-a-pixie-state)
13. [How to Add a Theme](#how-to-add-a-theme)
14. [How to Add a Provider](#how-to-add-a-provider)
15. [Where to Find the Specs](#where-to-find-the-specs)

## Before You Start

Three rules govern everything visual in vsclaude. They are not suggestions. If your change touches motion, captions, or the event pipeline, your reviewer will check it against these rules.

1. **Every animation is bound to a real event.** Nothing is decorative theater. If Pixie types, the agent is writing a file and you can see which one.
2. **Meaning is always preserved and always recoverable.** One click always drills into the exact underlying detail: tool name, inputs, diff, command, raw output.
3. **A non-technical person must be able to follow along via plain-language captions.**

If you are unsure whether a change respects these rules, open a draft PR early and ask. We would rather discuss design before you write 500 lines than after.

## Prerequisites

vsclaude is a Tauri 2.x desktop app with a Rust core and a React 19 frontend. You need both toolchains installed.

| Tool | Minimum version | Purpose | Notes |
| --- | --- | --- | --- |
| Node.js | 20 LTS | Runs the frontend toolchain | Use the version in `.nvmrc` |
| pnpm | 9.x | The only supported package manager | `corepack enable` then `corepack prepare pnpm@latest --activate` |
| Rust toolchain | stable via rustup | Compiles the Tauri Rust core | Install from [rustup.rs](https://rustup.rs) |
| Platform linker | OS native | Links the Rust binary | See platform notes below |

**Do not use npm or yarn.** The lockfile is `pnpm-lock.yaml` and CI installs with `pnpm install --frozen-lockfile`. A stray `package-lock.json` or `yarn.lock` will fail review.

### Rust toolchain is a hard prerequisite

The Rust toolchain (rustup plus cargo plus a platform linker) is required even if you only plan to touch the frontend, because `pnpm dev` builds and runs the Tauri shell. Install it before anything else.

```bash
# All platforms: install rustup, which installs cargo and the stable toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup default stable
rustc --version   # confirm it prints a version
```

Platform-specific linker requirements:

| Platform | Requirement |
| --- | --- |
| Windows | Microsoft Visual C++ Build Tools (MSVC) with the "Desktop development with C++" workload, plus the Windows 10/11 SDK |
| macOS | Xcode Command Line Tools: `xcode-select --install` |
| Linux | `build-essential`, `libwebkit2gtk-4.1-dev`, `libssl-dev`, and the GTK and AppIndicator dev packages listed in the Tauri prerequisites |

If `cargo build` fails with a linker error, this is almost always the missing piece.

## Environment Setup

```bash
# 1. Clone your fork
git clone https://github.com/<you>/vsclaude.git
cd vsclaude

# 2. Enable pnpm via corepack (ships with Node)
corepack enable

# 3. Install all workspace dependencies (frozen in CI, plain locally)
pnpm install

# 4. Run the desktop app in dev mode (builds Rust core, starts Vite, opens Tauri window)
pnpm dev
```

`pnpm dev` runs the Vite dev server with hot module replacement for the React frontend and compiles the Rust core through Tauri. The first run is slow because cargo compiles every dependency from scratch. Subsequent runs use the cargo cache and are fast.

Useful scripts (run from the repo root):

| Command | What it does |
| --- | --- |
| `pnpm dev` | Full desktop app with HMR |
| `pnpm build` | Production build of frontend plus Tauri bundle |
| `pnpm test` | Vitest unit tests across all packages |
| `pnpm test:e2e` | Playwright end-to-end tests |
| `pnpm lint` | ESLint across the monorepo |
| `pnpm format` | Prettier write |
| `pnpm typecheck` | TypeScript strict project references check |
| `pnpm storybook` | Storybook for components and every Pixie state |
| `cargo test` | Rust unit tests (run inside `apps/desktop/src-tauri`) |

## Repository Layout

We use a pnpm workspace monorepo. Applications live under `apps/`, shared libraries under `packages/`.

```
vsclaude/
  apps/
    desktop/                 # The Tauri 2.x application
      src/                   # React 19 + TypeScript frontend
      src-tauri/             # Rust core: PTY, fs watch, keychain, IPC, auto-update
  packages/
    contracts/               # FROZEN AgentEvent schema and shared types (the contract)
    providers/               # Provider adapters: claude-code, codex, gemini, ollama
    motion/                  # Pixie Rive bindings, sprite fallback, state machine glue
    ui/                      # Design system: tokens, themes, primitives
    terminal/                # xterm.js WebGL wiring to the Rust PTY
    editor/                  # Monaco integration
    store/                   # Zustand stores and Jotai motion atoms
  docs/                      # Specs: ARCHITECTURE, MOTION, PROVIDERS, and more
  .changeset/                # Changesets for versioning
```

Each package publishes a clean public API through its `index.ts` (or the `exports` field in its `package.json`). The directory structure inside a package is its own business and may change at any time.

## The Contracts-First Rule

This is the single most important architectural rule in the codebase.

> **All providers normalize into one `AgentEvent` stream, and everything visual consumes only `AgentEvent`. Build against `packages/contracts`. Never reach into another package's internals.**

The frozen, versioned contract lives at `packages/contracts/src/agent-event.ts`:

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

What this means in practice:

| Do | Do not |
| --- | --- |
| Import types from `@vsclaude/contracts` | Import from `@vsclaude/providers/src/claude-code/internal/...` |
| Consume an `AgentEvent` stream in any visual component | Couple a UI component to a specific provider's raw output |
| Add a new field to the contract via a versioned change (see below) | Mutate the `AgentEvent` shape ad hoc inside a provider |
| Use a package's published `index.ts` exports | Deep-import a path the package did not intend to expose |

ESLint enforces `no-restricted-imports` to block deep imports across packages. If you need something from another package and it is not exported, the correct fix is to export it from that package's public API in a separate, reviewed PR, not to reach in.

### Changing the contract

The `AgentEvent` schema is frozen, which means it changes deliberately and rarely. To evolve it:

1. Open an issue describing the new event type or field and why no existing field works.
2. Bump `schemaVersion` and document the change in `packages/contracts/CHANGELOG.md`.
3. Update every provider adapter to emit the new shape, and every consumer to handle it.
4. Add a Changeset. A contract change is almost always a minor or major bump.

Never silently widen `payload` to smuggle structured data that deserves a real field. The contract is the shared language of the whole app.

## Daily Development Workflow

```bash
git checkout main
git pull
git checkout -b feat/swarm-view-lod        # see branch naming below
pnpm install                                # in case deps changed
pnpm dev                                     # work with HMR
# ... make changes ...
pnpm lint && pnpm typecheck && pnpm test     # the local gate
pnpm changeset                               # describe your change for versioning
git commit -m "feat(motion): add LOD to swarm view"
git push -u origin feat/swarm-view-lod
# open a PR
```

Run `pnpm changeset` for any change that affects a published package's behavior or public API. Pure internal refactors and docs-only changes do not need a Changeset, but when in doubt, add one.

## Code Style

Formatting and linting are automated. Do not hand-format; let the tools do it.

- **Prettier** owns formatting. Run `pnpm format` or enable format-on-save with the Prettier config in the repo.
- **ESLint** owns correctness and import rules. Fix all errors and warnings. CI fails on warnings.
- **TypeScript strict** is on everywhere. There is no opt-out.

Hard TypeScript rules:

| Rule | Detail |
| --- | --- |
| No `any` in public APIs | Anything exported from a package's `index.ts` must be fully typed. Use `unknown` plus narrowing, or generics. |
| Explicit return types on exported functions | Inference is fine for local helpers, explicit for the public surface. |
| Discriminated unions for state | Model agent and UI state as tagged unions, not loose flags. |
| No `@ts-ignore` without a reason | Use `@ts-expect-error` with a one-line comment explaining why. |
| `const` over `let`, never `var` | Self-explanatory. |

React rules:

- Functional components with hooks only.
- Keep components under 200 lines. Extract sub-components and custom hooks when they grow.
- Memoize hot paths (`useMemo`, `useCallback`, `React.memo`) so a high-frequency `AgentEvent` stream does not re-render the world.
- Real data only. If a source returns nothing, render an empty state, never mock data, in any production path.

Rust rules (for `apps/desktop/src-tauri`):

- `cargo fmt` and `cargo clippy` must pass clean.
- Specific error types, proper logging through the `tracing` crate, no `unwrap()` on anything that can fail at runtime.

Documentation rules:

- **Never use the em dash character in any doc or comment.** Use commas, colons, parentheses, or reword. This is a hard rule and CI lints Markdown for it.
- American English, active voice, present tense.
- Fenced code blocks always carry a language tag.

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org). The format is:

```
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

Allowed types:

| Type | Use for |
| --- | --- |
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | A performance improvement |
| `test` | Adding or fixing tests |
| `build` | Build system, Tauri bundle, or dependency changes |
| `ci` | CI configuration |
| `chore` | Maintenance that does not fit above |

Scopes map to packages or apps: `contracts`, `providers`, `motion`, `ui`, `terminal`, `editor`, `store`, `desktop`. Examples:

```
feat(providers): add ollama streaming adapter
fix(motion): debounce targetX so Pixie stops jittering on rapid file_edit
docs(contracts): document schemaVersion bump policy
perf(terminal): batch PTY writes before WebGL flush
```

Breaking changes append `!` after the scope and explain in a `BREAKING CHANGE:` footer:

```
feat(contracts)!: rename file_edit payload field

BREAKING CHANGE: payload.path is now payload.filePath in file_* events.
```

Commit messages are validated by commitlint in a Git hook and again in CI.

## Branch Naming

Branch names mirror the commit type so reviewers know the intent at a glance:

```
<type>/<short-kebab-description>
```

| Pattern | Example |
| --- | --- |
| `feat/...` | `feat/swarm-view-lod` |
| `fix/...` | `fix/pty-reconnect-race` |
| `docs/...` | `docs/contributing-guide` |
| `refactor/...` | `refactor/motion-atom-split` |
| `chore/...` | `chore/bump-tauri-2-3` |

Keep branches short-lived and focused on one logical change. If a branch grows into several unrelated changes, split it.

## Pull Request Process

1. **One logical change per PR.** A reviewer should be able to hold the whole change in their head.
2. **Fill in the PR template.** State what changed, why, and how you verified it. Link the issue.
3. **Include a Changeset** when the change is user-facing or touches a public API.
4. **Add or update tests.** New logic ships with tests. Bug fixes ship with a test that would have caught the bug.
5. **Update Storybook** for any visual or Pixie-state change. Every Pixie state has a story.
6. **Self-review the diff** before requesting review. Remove debug logging, stray `console.log`, and commented-out code.
7. **Keep CI green.** A red PR will not be reviewed until it is green.
8. **Respond to review.** Push fixups, do not force-push over a reviewer mid-review unless asked.

At least one maintainer approval is required to merge. We squash-merge, and the squash title must be a valid Conventional Commit because that title drives the changelog.

## CI Checks That Must Pass

Every PR runs the full gate. All of these must be green before merge.

| Check | Command | Gate |
| --- | --- | --- |
| Install | `pnpm install --frozen-lockfile` | Lockfile must be in sync |
| Lint | `pnpm lint` | Zero errors and zero warnings |
| Format | `prettier --check .` | No formatting drift |
| Types | `pnpm typecheck` | TypeScript strict clean across project references |
| Unit tests | `pnpm test` | Vitest green |
| E2E tests | `pnpm test:e2e` | Playwright green |
| Rust tests | `cargo test` | Rust core green |
| Rust lint | `cargo clippy -- -D warnings` | Clippy clean |
| Docs lint | Markdown lint | No em dash character, valid links |
| Build | `pnpm build` | Production frontend and Tauri bundle build |
| Changeset | Changesets bot | Present when required |

If a flaky test blocks you, do not retry blindly. Open an issue, tag it `flaky`, and fix the flake or quarantine it in a tracked way.

## How to Add a Pixie State

Pixie is a Rive pixel-art state machine. Its inputs are `state`, `mood`, `intensity`, `targetX`, and `targetY`. Moods (`calm`, `focused`, `excited`, `struggling`) layer on top of the base state. Every state has idle, entry, and exit blends.

Existing states map directly to `AgentEventType`:

| State | Triggering event |
| --- | --- |
| `greeting` | `session_start` |
| `idle` | no activity |
| `sleeping` | long idle |
| `thinking` | `thinking` |
| `planning` | `todo_update` |
| `reading` | `file_read` |
| `typing` | `file_edit`, `file_create` |
| `searching` | `search` |
| `web` | `web_fetch` |
| `running` | `command_run` |
| `debugging` | `error` during a run |
| `building` | long build |
| `git` | `git_action` |
| `spawning` | `subagent_spawned` |
| `waiting` | `permission_request` |
| `success` | `complete` |
| `confused` | unresolved error |

To add a new state:

1. **Justify the event binding.** A new state must map to a real `AgentEvent` condition. If no event produces it, you are violating sacred rule 1. Stop and reconsider.
2. **Add the state to the Rive file** with idle, entry, and exit blends, and verify it composes with all four moods.
3. **Register the state** in the motion package's state enum and the event-to-state mapper in `packages/motion`.
4. **Wire the caption.** The state must yield a plain-language caption a non-technical person understands (sacred rule 3).
5. **Keep the drill-down.** Clicking Pixie in this state must still surface the underlying tool, input, or output (sacred rule 2).
6. **Add a Storybook story** for the new state across all moods and a few `intensity` values.
7. **Add a sprite-sheet fallback frame set** so the state works when Rive is unavailable.

```ts
// packages/motion/src/state-map.ts
export function stateForEvent(e: AgentEvent): PixieState {
  switch (e.type) {
    case 'file_read': return 'reading';
    case 'file_edit':
    case 'file_create': return 'typing';
    // ... add your new case here, bound to a real event ...
    default: return 'idle';
  }
}
```

## How to Add a Theme

Themes are token-driven. The design system uses Tailwind CSS v4 with CSS variables, so a theme is a set of variable values, not a fork of components.

1. **Create the token file** in `packages/ui/src/themes/<name>.css` defining the full token set. Start by copying the default theme so you cover every variable.

```css
/* packages/ui/src/themes/midnight.css */
:root[data-theme='midnight'] {
  --color-bg: #0b0e14;
  --color-surface: #11151c;
  --color-text: #e6e6e6;
  --color-accent: #7c6cff;
  /* ... cover every token the default theme defines ... */
}
```

2. **Register the theme** in the theme registry in `packages/ui` so the theme switcher lists it.
3. **Cover every token.** A partial theme leaves components reading missing variables. Diff your file against the default to confirm nothing is unset.
4. **Check contrast.** This is a trading-adjacent tool used for long sessions. Meet WCAG AA contrast for text and interactive elements.
5. **Verify in Storybook** by switching the global theme and confirming Pixie, the editor, and the terminal all read correctly.
6. **Dark mode is primary.** A light theme is welcome but must not regress the dark experience.

## How to Add a Provider

A provider is a thin adapter that runs an agent and normalizes its output into the `AgentEvent` stream. The visual layer never knows which provider it is watching, because it only consumes `AgentEvent`.

1. **Create the package directory** under `packages/providers/src/<provider>`.
2. **Implement the adapter interface** from `@vsclaude/contracts`. The adapter starts the agent process or SDK, reads its stream, and emits `AgentEvent` values.

```ts
// packages/providers/src/<provider>/adapter.ts
import type { AgentEvent } from '@vsclaude/contracts';

export interface ProviderAdapter {
  readonly id: string; // 'claude-code' | 'codex' | 'gemini' | 'ollama' | string
  start(opts: StartOptions): AsyncIterable<AgentEvent>;
  stop(): Promise<void>;
}
```

3. **Map every block to an event.** Each chunk of the agent's output becomes one `AgentEvent`. The Claude Code adapter, for reference, runs the agent in streaming mode (`claude -p --output-format stream-json --verbose`, or the Claude Agent SDK) and maps each block. The `Task` tool spawning a sub-agent becomes a `subagent_spawned` event, which makes the swarm view come alive automatically.
4. **Set `provider`, `schemaVersion`, and a `caption`** on every event. The caption is mandatory: it is what the non-technical viewer reads.
5. **Preserve `raw`.** Keep the original chunk in `raw` so the drill-down can always recover exact detail (sacred rule 2).
6. **Stay in your lane.** A provider may depend only on `@vsclaude/contracts`. It must not import from `ui`, `motion`, or `store`. Data flows one way: provider produces events, the app consumes them.
7. **Add adapter tests** that feed recorded fixture output and assert the exact `AgentEvent` sequence. Record a fixture from a real session and snapshot it.
8. **Register the provider** in the provider registry and add it to the model picker. It is bring-your-own-key, so wire secret storage through the Rust core's OS keychain bridge, never to disk in plaintext.

## Where to Find the Specs

The specs are the source of truth. When code and a spec disagree, that is a bug in one of them; flag it.

| Spec | Covers |
| --- | --- |
| [Architecture](./docs/ARCHITECTURE.md) | System overview, process model, IPC, the event pipeline |
| [Motion](./docs/MOTION.md) | Pixie states, Rive inputs, fallback animator, the three sacred rules |
| [Providers](./docs/PROVIDERS.md) | Adapter contract, per-provider mapping, secret handling |
| [Contracts](./packages/contracts/README.md) | The frozen `AgentEvent` schema and its versioning policy |
| [Design System](./docs/DESIGN_SYSTEM.md) | Tokens, themes, Tailwind v4 setup, component primitives |
| [Testing](./docs/TESTING.md) | Vitest, Playwright, cargo test, Storybook conventions |

If you cannot find what you need, open an issue labeled `docs` so we can fill the gap. A missing spec is a contribution opportunity.

Welcome aboard. Build something alive, truthful, and cozy.
