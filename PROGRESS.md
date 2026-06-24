# Progress

A living handoff document. Written so the next engineer (or the next session) can
continue seamlessly.

## Last updated

2026-06-24. Session 3 (Step 0 plus two parity slices: quick open, status bar).

## Slice 2: the workbench status bar (done)

The spec is `specs/STATUS_BAR.md`; this opens up catalog 5.5 and gives later
features (problems, search, task and debug state) a home to contribute to.

- **Status-bar model** (`@vsclaude/core-shell`): `status-bar.ts` adds a
  `StatusBarItem` shape and an `orderStatusItems` helper (filter by side, sort by
  priority with a stable id tie break). Reusable and unit tested.
- **Editor-status store** (`editor-bridge.ts`): alongside the active editor it now
  publishes a small `EditorStatus` snapshot (line, column, selection count,
  language, EOL, indentation) with a subscribe API. EditorPanel publishes it on
  mount and on cursor, selection, content, and model changes, and clears it on
  unmount. 2 more unit tests.
- **Status bar** (`StatusBar.tsx`): an always-present bottom strip in every
  presentation mode. Left: branch and change count (via the same porcelain path
  the review overlay uses, native only) and the workspace name. Right: language,
  EOL, indentation, cursor position, and a selection count. The cursor item opens
  go-to-line (new Ctrl or Cmd plus G, also a Go to Line/Column command), and the
  branch item opens the review overlay.
- **Quality**: 200 unit tests (193 plus 7), typecheck, lint, and `cargo check`
  clean (no Rust change this slice), the renderer build succeeds, and 9 Playwright
  e2e pass (the new one asserts the bar shows the cursor position and language and
  that clicking the cursor opens go-to-line). Matrix 5.5 moved to Done 4, Partial
  8, Missing 15.

## Slice 1: quick open and the quick-pick framework (done)

The spec is `specs/QUICK_OPEN.md`; this closes most of catalog 5.6 and builds the
reusable picker that later features lean on.

- **Contract v4** (`packages/contracts`): added `fs.walk`, a recursive file index
  (skips node_modules, .git, and build outputs, never follows a symlink, caps the
  result). `IPC_PROTOCOL_VERSION` is now 4 and the Rust const in `lib.rs` matches.
- **Rust core** (`fs_ops.rs`): `fs_walk` does an iterative, symlink-safe walk that
  skips unreadable subdirectories rather than failing. `cargo check` is clean.
- **Quick-pick framework** (`@vsclaude/core-shell`): `quick-pick.ts` adds the
  `QuickPickItem` shape, a `filterQuickPick` ranker that reuses the subsequence
  scorer, and a `parsePaletteInput` prefix router (`>` commands, `:` go to line,
  base mode otherwise; `@` and `#` reserved for the code-intelligence slice).
  `Command` gained an optional `keybinding` label. 13 new unit tests.
- **Editor bridge** (`apps/desktop/src/lib/editor-bridge.ts`): tracks the active
  Monaco editor so `:` go-to-line can reveal and select a line, clamped to the
  document bounds. EditorPanel publishes itself on mount and focus. 5 unit tests.
- **Palette** (`CommandPalette.tsx`): one component, two entry points (Ctrl or Cmd
  plus K for commands, plus P for files), live prefix routing, a real workspace
  file index (`useFileIndex`, demo files as the browser fallback), keybinding
  display, and accessible combobox and listbox semantics. New Go to File and Show
  All Commands palette entries advertise their real shortcuts.
- **Quality**: 193 unit tests (175 plus 18), typecheck, lint, and `cargo check`
  clean, the renderer build succeeds, and 8 Playwright e2e tests pass (the two new
  ones cover Ctrl or Cmd plus P file open and the `>` route back to commands). The
  feature matrix 5.6 roll-up moved to Done 7, Partial 0, Missing 4.

## Step 0: VS Code parity feature matrix (done)

`specs/FEATURE_MATRIX.md` is the new single source of truth for the editor and IDE
capability surface that vsclaude shares with VS Code. It audits the real repository
(source, IPC contracts, Rust core, tests) against the full catalog, section by
section, and is the gate for every parity slice that follows: only Partial and
Missing items become specs and slices, and a row moves to Done only when the
feature is implemented, tested, accessible, integrated, and documented.

State at the audit (2026-06-24): 329 capabilities across 23 sections, scored Done
49, Partial 77, Missing 198, Not planned 5. The largest gaps are code intelligence
(no external LSP host, 5.2), the workbench layout (a fixed presentation-mode shell
rather than a dockable workbench, 5.5), the git surface beyond status and commit
(5.9), and the terminal productivity surface (5.10). The AI agent and motion layer
is the product's own half and stays tracked in ROADMAP.md, not in this matrix.

## Phase A1: workspace and real filesystem (done)

vsclaude now opens a real project folder and works on real files, not the demo
fixture. The spec is `specs/WORKSPACE_AND_FILES.md`.

- **Contract v2** (`packages/contracts`): bumped `IPC_PROTOCOL_VERSION` to 2 and
  added the filesystem mutation surface (`fs.stat`, `fs.createFile`,
  `fs.createDir`, `fs.rename`, `fs.delete`, `fs.copy`), gave `fs.readFile` and
  `fs.writeFile` an `mtimeMs` for conflict detection, and added the `FileStat`
  type. The Rust core mirrors the version.
- **Rust core** (`fs_ops.rs`): real implementations of every new command plus the
  previously declared `fs.watch`/`fs.unwatch`, backed by `notify` (a 150 ms
  debounced recursive watcher that emits `fs:changed`) and `trash` (deletes go to
  the OS recycle bin, so they are recoverable). Every returned path is normalized
  to forward slashes for stable keys across platforms. Open-folder uses
  `tauri-plugin-dialog`. `cargo check` is clean with no warnings.
- **Pure model** (`@vsclaude/editor`): new `workspace/` modules with path helpers
  (normalize, parent, join, move validation, duplicate-name derivation), a lazy
  workspace-tree builder reusing the existing `flattenVisible` renderer, dir-merge
  and subtree-prune reconcilers, and the recent-projects model. 14 new unit tests.
- **Renderer**: a `useWorkspace` hook owns the open roots, the lazily loaded tree,
  open documents with dirty tracking and save-to-disk, all file operations, and
  live external-change reconciliation. New `WorkspaceExplorer` (lazy tree, context
  menu, inline create and rename, drag-and-drop move, dirty markers, a11y tree),
  `WorkspaceEditor` (tab bar, Monaco bound to the active document, external-change
  banner), and a small `ContextMenu`. Recent projects and open roots persist to
  local storage and restore on relaunch. With no folder open the app falls back to
  the demo experience, so the soul is intact.
- **Command palette**: Open Folder, Open Recent (one per remembered project), New
  File, Save All, and Close Folder.
- **Quality**: 172 unit tests pass (158 plus 14), typecheck and lint are clean
  (zero warnings), the renderer production build succeeds, all 6 Playwright e2e
  tests pass, and `cargo check` is clean.

## Earlier: Phase 0 and the native build (Session 1)

The notes below describe the foundation that Session 2 built on.

## Last updated (session 1)

2026-06-21. Session 1 (Phase 0 foundation, the action integration, the IDE shell, and the native desktop build).

## Working IDE shell

The browser renderer is now a real, multi-panel IDE that composes every package
end to end (run it with `pnpm dev`):

- **Session engine** (`apps/desktop/src/session/`): replays a scripted multi-agent
  session (an orchestrator delegating to two workers) through the real motion
  mapper, agent runtime, chat builder, and swarm helpers.
- **Panels**: file explorer (editor tree model), Pixie stage (Pixie performing the
  current action), swarm view (each agent performing its own action with token
  meters), conversation timeline with the tool-call inspector, token and cost
  dashboard, and a narrated accessibility stream.
- **Shell**: a command palette (Ctrl or Cmd plus K) driven by the core-shell
  registry, five presentation modes (companion, stage, swarm, minimal, cozy),
  runtime theming via the design system, reduced-motion and sound toggles, all
  persisted to local storage.

Builds (vite), typechecks, tests, and lints clean.

## Native desktop IDE (done)

The app now builds and runs as a real native desktop IDE:

- **Toolchain**: Rust stable on the MSVC host is installed; the existing Visual
  Studio C++ Build Tools and Windows SDK provide the linker. `pnpm tauri:build`
  produces the native `vsclaude.exe` plus a WiX `.msi` and an NSIS setup `.exe`.
  The window launches and runs the full renderer in WebView2.
- **Rust core**: filesystem ops, OS-keychain secrets (keyring), a real terminal
  PTY (portable-pty / ConPTY), and a live provider that spawns
  `claude --output-format stream-json` and streams it to the renderer.
- **Monaco editor**: real editing with offline workers, syntax, a minimap, and
  save, as the protagonist of the layout, with Pixie in a companion corner.
- **xterm terminal**: wired to the real PTY natively, with the agent's command
  activity as the browser fallback.
- **Diff review and commit**: a Rust git module (status, diff, commit) and a
  review overlay that lists changed files, shows each file's colored diff, and
  commits for real with "Accept all and commit".
- **Live session**: `useLiveProvider` normalizes the live stream through the same
  `parseClaudeStreamLine` adapter, so a real Claude Code run drives Pixie and the
  swarm; the recorded demo is the fallback.
- **Storybook**: a story for every component and every Pixie state (200 actions),
  with the a11y addon. `build-storybook` passes.
- **Playwright**: five e2e tests over the core flows, all passing.
- **Packaging**: a three-OS installer pipeline (`.github/workflows/desktop-release.yml`)
  and `BUILD.md` documenting signing.
- **Hardening**: strict CSP (with `worker-src` for Monaco), minimal Tauri
  capabilities, secrets only in the OS keychain. Pixie is a static SVG driven by a
  timer (no animation loop), so idle CPU is near zero.

## Remaining (needs your input or hosting)

- **Signed release**: provide the certificates and the build signs automatically
  (Windows Authenticode, Apple Developer ID notarization). See `BUILD.md`.
- **Auto-update**: generate the updater key (`tauri signer generate`), host
  `latest.json`, then add `tauri-plugin-updater`. Gated on choosing an update host.
- **Rive Pixie**: swap the pixel sprite for a Rive artboard driven by the motion
  mapper (its output is already the right shape).
- **Native-window e2e**: add tauri-driver plus WebdriverIO alongside the Playwright
  renderer suite.

## Agent action integration

The 200 agent behaviors shown in the banner are now a working part of the IDE,
wired through every layer:

- **Contracts**: a canonical `AgentAction` catalog (`packages/contracts/src/actions.ts`),
  200 actions across 20 categories, each mapped to its `AgentEventType`,
  `PixieState`, and a plain-language caption. `MotionDirective` gained an
  `actionId` field.
- **Motion**: `classifyAction(event)` (`packages/motion/src/classify.ts`) resolves
  any real event to its most specific action (git kind, command keywords, tool
  name). The mapper stamps the resolved `actionId` onto every directive.
- **Icons**: `scripts/gen-action-icons.mjs` extracts the 200 pixel symbols from
  the banner into a sprite (`apps/desktop/src/assets/pixie-actions.svg`), verified
  to match the catalog exactly. `ActionIcon` renders Pixie performing any action.
- **App**: the Pixie stage shows Pixie performing the current action, and the
  activity feed shows each event's action icon, label, and caption, with the
  action id in the drill-down.
- **Docs**: `docs/agent-actions.md` is generated from the catalog by
  `scripts/gen-actions-doc.mjs`.

All layers build, type, test, and lint clean.

## What the Phase 0 session delivered

The complete Phase 0 foundation, built, typed, tested, and linted clean.

- **Monorepo**: pnpm workspaces, TypeScript strict (with `noUncheckedIndexedAccess`
  and `verbatimModuleSyntax`), ESLint flat config, Prettier, Vitest, Changesets,
  EditorConfig. Root `tsconfig` project references across all packages.
- **Frozen contracts** (`packages/contracts`): the `AgentEvent` schema and typed
  payloads, the IPC command and event protocol, the `ProviderAdapter` contract,
  the Pixie motion shapes and the `EVENT_TO_STATE` table, the full design-token
  system with four bundled themes, the plugin API, and shared app state. 14 unit
  tests. This is the keystone; everything imports only from here.
- **Specs** (`specs/`): 27 specification documents, about 12,700 lines, covering
  the vision, architecture, event schema, providers, mascot, swarm, design system,
  editor, terminal, git, chat, MCP, permissions, context and checkpoints,
  settings, sessions, cost, onboarding, accessibility, sound, plugin SDK, testing,
  performance, security, build and distribution, and CI.
- **Twelve packages**, each with real initial domain logic, a passing test suite,
  and a README:
  - `design-system`: tokens to CSS variables, theme registry, theme resolution.
  - `core-shell`: immutable panel-tree layout model, fuzzy command registry.
  - `editor`: file-tree model, visible-row flattening, tab manager.
  - `terminal`: typed PTY client over the IPC contract, plus a fake transport.
  - `agent-runtime`: AgentEvent-to-AgentTree reducer, session manager.
  - `providers`: provider registry, Claude Code stream-json line parser.
  - `motion`: the event-to-motion mapper (captions, intensity, mood, priority,
    dwell, gaze). The brain of the soul.
  - `swarm`: roster, delegation edges, token aggregation, layout selection.
  - `chat`: timeline builder (collapses tool calls with results), turn grouping,
    inspector model.
  - `git`: `git status --porcelain` parser, git-action event builder.
  - `persistence`: session serialize and parse with validation, settings deep
    merge, in-memory secret store.
  - `plugin-sdk`: plugin host with manifest validation and registration lifecycle.
- **Desktop app** (`apps/desktop`): Tauri 2 shell with a Rust core implementing
  real filesystem and OS-keychain commands, and a React 19 renderer that plays a
  scripted demo session driving the Pixie stage and an activity feed with raw
  drill-down. The typed IPC bridge mirrors the contract.
- **Repository polish**: an attractive SVG banner, a professional README with
  badges, ROADMAP, CHANGELOG, CONTRIBUTING, code of conduct, security policy,
  issue and PR templates, and CI workflows.

## Quality gates (all green)

- `pnpm build:packages` builds all 13 packages via `tsc -b` project references.
- `pnpm -r run typecheck` is clean across every package and the app.
- `pnpm test` passes (every package has a real test suite).
- `pnpm lint` passes with no errors.
- Zero em dash characters anywhere in the repository.

## Key decisions

- **One event schema**: all providers normalize into `AgentEvent`; everything
  visual consumes only `AgentEvent`. This is the load-bearing decision.
- **Contracts are frozen and versioned** (`AGENT_EVENT_SCHEMA_VERSION`,
  `IPC_PROTOCOL_VERSION`, `PLUGIN_API_VERSION`). Payload types are declared as
  `type` aliases so they are assignable to the loose `payload` record without a
  cast.
- **pnpm workspaces** over npm for the monorepo. Documented in `specs/TECH_STACK.md`.
- **Packages ship real domain logic now, UI later.** The initial layers are pure,
  testable TypeScript that depend only on `@vsclaude/contracts`. React, Monaco,
  xterm, and Rive integrations are tracked in `ROADMAP.md` as the next milestones.
- **Authorship**: commits are attributed to the repository owner only.

## Next session should

1. Wire the `@vsclaude/motion` mapper into the desktop app, replacing the local
   `motion-lite` stand-in, so the demo runs through the real mapper.
2. Stand up the `design-system` component primitives and Storybook, with a story
   for every Pixie state and mood.
3. Begin the Monaco integration in `editor` and the xterm WebGL terminal wired to
   the Rust PTY.
4. Author the Rive artboard for Pixie and the sprite-sheet fallback.
5. Implement live process spawning in `providers` (Claude Code first) so a real
   session can drive the views end to end.

## Notes and caveats

- The Rust core (`apps/desktop/src-tauri`) is written but not yet compiled in this
  environment (the Rust toolchain was not installed). Install `rustup` plus the
  platform Tauri prerequisites, then `pnpm tauri:dev`. See
  `specs/BUILD_AND_DISTRIBUTION.md`.
- App icons are not yet generated. Run `pnpm --filter @vsclaude/desktop tauri icon
  <source.png>` to produce the `src-tauri/icons` set before a native build.
