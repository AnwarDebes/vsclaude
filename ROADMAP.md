# Roadmap

Status legend: `[x]` done, `[~]` in progress, `[ ]` planned.

vsclaude is built in phases. Phase 0 (the foundation) is the focus of the initial
work: frozen contracts, a scaffolded monorepo, real initial logic in every
package, a working demo, and the full specification set. The phases below track
the journey from there to a signed, installable, delightful editor.

## Phase 0: Foundation

- [x] Monorepo scaffold (pnpm workspaces, TypeScript strict, ESLint, Prettier)
- [x] Vitest, CI skeleton, Changesets
- [x] Frozen `@vsclaude/contracts`: AgentEvent, payloads, IPC, provider adapter,
      motion shapes, design tokens, plugin API, shared state
- [x] Full specification set in `specs/` (27 documents)
- [x] Community docs, issue templates, contributor guide
- [x] Tauri app skeleton (Rust core: filesystem and OS-keychain commands)
- [x] Animated first-run demo (real AgentEvent stream drives Pixie)
- [x] Real initial domain logic, tested, in all 12 packages

## Phase 1: Core systems

- [x] `core-shell`: panel-tree layout model, command registry
- [x] `editor`: file-tree model, tab manager
- [~] `editor`: Monaco integration, diff editor, multi-root workspaces
- [x] `terminal`: typed PTY client over IPC
- [~] `terminal`: xterm.js WebGL rendering wired to a real Rust PTY
- [x] `agent-runtime`: AgentEvent reducer, agent-tree session manager
- [x] `providers`: registry, Claude Code stream-json parser
- [~] `providers`: live process spawning, Codex, Gemini, Ollama adapters
- [x] `design-system`: tokens to CSS, theme registry
- [~] `design-system`: component primitives, Storybook for every Pixie state

## Phase 2: The soul and the experience

- [x] `motion`: the event-to-motion mapper (debounce, priority, dwell, captions)
- [~] `motion`: Rive state machine for Pixie, sprite-sheet fallback
- [x] `swarm`: roster, delegation edges, token aggregation, layout selection
- [x] `swarm`: the workshop scene, each agent performing its action, token meters
- [ ] `swarm`: animated delegation threads and a timeline scrubber
- [x] `chat`: timeline builder, turn grouping, tool-call inspector model
- [x] `chat`: the conversation timeline UI with the tool-call inspector
- [ ] `chat`: plan view and side-by-side diff review
- [x] `git`: porcelain status parser, git-action events
- [~] `git`: full status and commit UI
- [x] `persistence`: session serialize and parse, settings merge, secret store
- [~] `persistence`: checkpoints and time-travel, keychain via Rust IPC

## Phase 3: Delight, hardening, reach

- [x] First-run shell: presentation modes, command palette, runtime theming
- [~] Accessibility: narrated stream and reduced motion done; contrast audit pending
- [ ] Sound design (Tone.js, off by default)
- [ ] Performance profiling against the budgets
- [x] `plugin-sdk`: host, manifest validation, registration lifecycle
- [ ] Two example plugins (a theme and a companion skin)
- [ ] Signed installers, auto-update, CI for all three OSes

## Phase 4: Finish

- [ ] Full e2e suite (Playwright) for the core flows
- [ ] Docs with GIFs, polished README screenshots
- [ ] Tagged 1.0 release
