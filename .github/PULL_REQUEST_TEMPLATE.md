<!--
  vsclaude pull request template.
  Fill in every section. Delete the HTML comment hints as you go, but keep the headings.
  Empty sections are not allowed: write "N/A" with a one-line reason instead.
  A non-technical reviewer should be able to read the Summary and understand what changed.
-->

# Pull Request

> One PR, one focused change. If this PR does two unrelated things, split it.
> Keep the title in imperative mood, for example "Add waiting state blend to Pixie" not "Added" or "Adds".

## Summary

<!--
  Two to five sentences in plain language. What does this change do, and why?
  Lead with the user-visible or developer-visible effect, then the mechanism.
  Remember Motion Rule 3: a non-technical person should follow along, so avoid jargon in the first sentence.
-->



## Related spec or issue

<!--
  Link the spec this PR implements against and the issue or ticket it closes.
  vsclaude is contract-first: most changes should trace back to a spec under docs/ or a frozen contract.
  Use "Closes #123" so the issue auto-closes on merge. Use "Refs #123" for partial work.
-->

- Spec: <!-- e.g. [Architecture](../docs/ARCHITECTURE.md), [AgentEvent contract](../packages/contracts/src/agent-event.ts) -->
- Issue: <!-- Closes #___  /  Refs #___ -->
- Design or Rive source: <!-- link to the .riv file, Figma frame, or Storybook story if motion or UI changed; N/A otherwise -->

## Type of change

<!-- Check every box that applies with an x, like [x]. Leave the rest unchecked. -->

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds capability)
- [ ] Breaking change (fix or feature that changes existing behavior or a public contract)
- [ ] Motion or visual change (Pixie state, Rive state machine, sprite fallback, swarm canvas, UI transition)
- [ ] Provider adapter (Claude Code, Codex, Gemini, Ollama, or a new adapter)
- [ ] Contract change (`packages/contracts`, AgentEvent schema, or any frozen interface)
- [ ] Rust core change (Tauri commands, PTY, filesystem watcher, keychain, IPC, auto-update)
- [ ] Performance (rendering, bundle size, memory, startup time)
- [ ] Refactor (no behavior change)
- [ ] Documentation only
- [ ] Build, CI, or tooling
- [ ] Dependency update

### Breaking change details

<!--
  Required only if you checked "Breaking change" or "Contract change" above. Otherwise write N/A.
  Spell out exactly what breaks, who it affects, and the migration path.
-->

- What breaks:
- Migration path:
- `schemaVersion` bumped? <!-- yes/no; if the AgentEvent shape changed, schemaVersion MUST increase -->

## Screenshots, GIFs, or recordings

<!--
  REQUIRED for any motion or visual change. A still screenshot is not enough for animation:
  attach a short GIF or screen recording (MP4 or WebM) so reviewers see the motion, not a frozen frame.
  Show before and after side by side when changing existing behavior.
-->

| Before | After |
| ------ | ----- |
|        |       |

<!-- For motion changes, also describe the trigger so reviewers can verify Motion Rule 1. -->

- Which AgentEvent triggers this animation? <!-- e.g. permission_request -> waiting state -->
- Which Pixie state, mood, and intensity are exercised? <!-- e.g. waiting / focused / low -->
- Storybook story that demonstrates it: <!-- link or path; every Pixie state must have a story -->

## How this was tested

<!--
  Concrete steps a reviewer can reproduce. Name the commands you actually ran.
  "Tested locally" is not sufficient. Be specific.
-->

```bash
# Examples; replace with what you actually ran
pnpm test                 # Vitest unit tests
pnpm test:e2e             # Playwright end to end
pnpm storybook            # visual review of Pixie states
cargo test                # Rust core tests
pnpm build                # production build of apps/desktop
```

- Manual verification steps:
  1.
  2.
- Platforms exercised: <!-- macOS / Windows / Linux. Note if Rust toolchain or MSVC build tools were involved. -->

## The Three Sacred Motion Rules

<!--
  Required for any change that touches Pixie, the swarm, captions, or the event stream.
  If this PR is pure backend or docs with no motion surface, write N/A and skip the three checkboxes.
-->

- [ ] **Bound to a real event.** Every animation added or changed maps to a real `AgentEvent`, not decorative theater.
- [ ] **Meaning is recoverable.** One click still drills into the underlying detail: tool name, inputs, diff, command, or raw output.
- [ ] **Plain-language caption.** A non-technical person can follow along; the `caption` field is populated and readable.

## Contract and architecture compliance

<!--
  vsclaude normalizes every provider into one AgentEvent stream. Visual code consumes only AgentEvent.
  These checks protect that invariant.
-->

- [ ] No visual or UI code reads provider-specific data directly; it consumes `AgentEvent` only.
- [ ] If a provider adapter changed, it still emits valid `AgentEvent` objects and maps unknown blocks safely.
- [ ] The frozen `AgentEvent` contract was not altered, OR a contract change is declared above with a `schemaVersion` bump and reviewer sign-off.
- [ ] New event mapping paths handle the `raw` passthrough so detail drill-down still works.
- [ ] Locked tech decisions respected (Tauri 2.x core, React 19 + TS strict, Zustand, TanStack Query, Monaco, xterm.js + WebGL PTY, Tailwind v4 tokens, Rive primary motion). No off-roadmap framework introduced without a spec.

## Engineering checklist

<!-- Everything here is expected to pass before review. Unchecked boxes need a one-line reason. -->

### Tests

- [ ] Unit tests added or updated for new logic (Vitest for TS, `cargo test` for Rust).
- [ ] Playwright e2e added or updated for new user flows or fixed regressions.
- [ ] Edge cases covered: empty event stream, malformed provider output, long idle, rapid event bursts, permission denied.
- [ ] All tests pass locally.

### Stories and visuals

- [ ] Storybook story added or updated for every new or changed Pixie state, mood, and intensity.
- [ ] Sprite-sheet fallback verified if the Rive state changed (the fallback animator must stay in sync).
- [ ] No layout shift or flicker introduced in the editor, terminal, or swarm canvas.

### Documentation

- [ ] Relevant spec under `docs/` updated, or a follow-up issue filed and linked.
- [ ] Public APIs, Tauri commands, and exported types have doc comments.
- [ ] `CHANGELOG` entry via Changesets added (`pnpm changeset`) for any user-facing or contract change.
- [ ] Cross-links to sibling specs use relative paths and resolve.

### Accessibility

- [ ] Keyboard navigation works for all new interactive elements (focus order, visible focus ring, Escape to dismiss).
- [ ] Screen reader labels and ARIA roles present where needed; motion changes have a text or caption equivalent.
- [ ] Color contrast meets WCAG AA against the dark theme tokens.
- [ ] Respects `prefers-reduced-motion`: heavy animation degrades to a calm or static state.

### Code quality

- [ ] TypeScript strict passes with no new `any` and no unexplained `@ts-ignore`.
- [ ] ESLint and Prettier pass (`pnpm lint`, `pnpm format:check`).
- [ ] Rust changes pass `cargo clippy` and `cargo fmt --check` with no new warnings.
- [ ] No stray `console.log`, `dbg!`, debug-only code, or commented-out blocks left behind.
- [ ] No secrets, API keys, or tokens committed; secrets stay in the OS keychain via the Rust core.

### Writing style (docs and captions)

- [ ] **No em dash character anywhere** in code, comments, captions, or docs. Use commas, colons, or parentheses instead. This is a hard rule.
- [ ] Captions and user-facing strings are American English, active voice, and plain language.

### CI

- [ ] CI is green (build, lint, typecheck, unit, e2e, Rust). Do not request review while red.
- [ ] Bundle size and startup time did not regress beyond the agreed budget (note the numbers if this PR touches the render path).

## Performance notes

<!-- Required for changes on the render path, the swarm, or the Rust core. Otherwise N/A. -->

| Metric | Before | After | Budget |
| ------ | ------ | ----- | ------ |
| Cold start (ms) |  |  |  |
| Bundle size (KB, apps/desktop) |  |  |  |
| Swarm steady-state FPS |  |  | 60 |
| Memory at idle (MB) |  |  |  |

## Rollout and risk

- Risk level: <!-- low / medium / high -->
- Feature flag: <!-- name and default, or N/A -->
- Rollback plan: <!-- how to revert safely; note any data or schema migration that complicates revert -->
- Auto-update impact: <!-- does this require a new Tauri release channel build? N/A if not -->

## Reviewer notes

<!--
  Anything that helps the reviewer: where to start, what you are unsure about, known follow-ups,
  intentionally out-of-scope items, and any decision you want a second opinion on.
-->



---

<sub>By opening this PR you confirm the change is yours to contribute and follows the vsclaude contribution guidelines and the Three Sacred Motion Rules.</sub>
