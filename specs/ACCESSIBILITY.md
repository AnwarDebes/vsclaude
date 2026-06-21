# Accessibility

Accessibility is a product pillar of vsclaude, not a late audit. The entire premise of the app (watch your agent work through living animation) only holds if it works equally well for someone who cannot see the animation, cannot use a mouse, cannot perceive certain colors, or needs motion turned off. This document is the binding contract for that promise. It specifies full keyboard operability, screen-reader labeling for every surface including a narrated event stream that voices what Pixie is doing, a reduced-motion mode that swaps animation for clear status and captions while preserving full meaning, high-contrast and color-blind-safe themes, scalable UI, the concrete ARIA patterns each region uses, and the design of the narration text generator. The third sacred motion rule (a non-technical person must be able to follow along via plain-language captions) and accessibility share one mechanism: the caption stream. We build it once and it serves both.

## Table of contents

- [1. Commitments and conformance target](#1-commitments-and-conformance-target)
- [2. Architecture of the a11y layer](#2-architecture-of-the-a11y-layer)
- [3. Full keyboard operability](#3-full-keyboard-operability)
- [4. Screen-reader labeling and roles](#4-screen-reader-labeling-and-roles)
- [5. The narrated event stream](#5-the-narrated-event-stream)
- [6. The narration text generator](#6-the-narration-text-generator)
- [7. Reduced-motion mode](#7-reduced-motion-mode)
- [8. High-contrast and color-blind-safe themes](#8-high-contrast-and-color-blind-safe-themes)
- [9. Scalable UI](#9-scalable-ui)
- [10. ARIA patterns per region](#10-aria-patterns-per-region)
- [11. Settings surface](#11-settings-surface)
- [12. Testing and CI gates](#12-testing-and-ci-gates)
- [13. Definition of done checklist](#13-definition-of-done-checklist)

## 1. Commitments and conformance target

These are non-negotiable. A change that regresses any of them does not ship.

| # | Commitment | Mechanism |
| --- | --- | --- |
| C1 | Everything is operable by keyboard alone, with a visible focus ring. | Focus management, `tabindex`, roving tabindex, command palette |
| C2 | Every meaningful surface has a screen-reader accessible name and role. | ARIA roles and labels audited in Storybook and Playwright |
| C3 | What Pixie does is narrated in words, in real time, for non-sighted users. | The narrated event stream (section 5) fed by captions |
| C4 | Meaning is never lost when animation is disabled. | Reduced-motion swaps motion for text and status, never removes data |
| C5 | No information is encoded by color (or motion) alone. | Icon plus shape plus text accompany every status hue |
| C6 | Themes meet WCAG AA, the high-contrast theme meets AAA. | Token-driven themes, contrast checked in CI |
| C7 | UI scales to 200 percent and respects OS text size without loss of content. | `rem`-based sizing, reflow, no fixed pixel text |
| C8 | Reduced motion, high contrast, and CVD safety honor OS settings on first launch. | Read OS media queries and platform flags at boot |

The conformance target is **WCAG 2.2 Level AA across the whole app**, with the high-contrast theme reaching **Level AAA** for text and non-text contrast. We track the relevant success criteria explicitly: 1.4.3 and 1.4.11 (contrast), 1.4.10 (reflow), 1.4.12 (text spacing), 2.1.1 and 2.1.2 (keyboard, no trap), 2.4.3 and 2.4.7 (focus order and visibility), 2.5.7 (dragging alternatives), 3.2.x (predictable), and 4.1.2 and 4.1.3 (name/role/value and status messages). Section 12 maps each to a test.

## 2. Architecture of the a11y layer

Accessibility is a thin cross-cutting package plus disciplined consumption, not a feature bolted onto one screen. It lives next to the design system and the mascot package so both share it.

```
packages/
  a11y/
    src/
      narrator/
        generate.ts        # pure caption -> narration string generator
        templates.ts        # per-event-type narration templates
        humanize.ts         # path shortening, command summarizing, pluralization
        verbosity.ts        # terse | normal | verbose policy
      live-region/
        LiveRegion.tsx      # polite + assertive aria-live host
        announce.ts         # queue, debounce, dedupe announcer
      focus/
        FocusRing.tsx       # token-driven visible focus styles
        useRovingTabindex.ts
        useFocusTrap.ts     # modal/drawer trap with restore
        focusOrder.ts       # per-mode focus order resolver
      prefs/
        useA11yPrefs.ts     # OS + user override resolution
        media.ts            # prefers-reduced-motion / contrast / forced-colors
      testing/
        axe.ts              # axe-core harness for Vitest + Playwright
```

`packages/a11y` depends only on `packages/contracts` (for `AgentEvent`) and the design tokens. The mascot controller calls into `narrator` and `announce`; the chat, terminal, editor, and swarm views call into `focus` and the live region. There is one announcer instance per window so announcements from every subsystem are serialized and never collide.

The resolution order for every accessibility preference is: **OS setting -> user override in settings -> default**. The OS setting is the initial value; an explicit user toggle wins after that and is persisted (see [Settings, Themes, Persistence](./SETTINGS_THEMES_PERSISTENCE.md)).

```ts
// packages/a11y/src/prefs/useA11yPrefs.ts
export interface A11yPrefs {
  reducedMotion: boolean;
  contrast: 'normal' | 'high';
  cvdSafe: boolean;
  narration: 'off' | 'terse' | 'normal' | 'verbose';
  uiScale: number; // 1.0 .. 2.0
}

// resolve(os, override) => os value unless the user set an explicit override
export function resolvePref<T>(os: T, override: T | undefined): T {
  return override ?? os;
}
```

## 3. Full keyboard operability

Every action reachable by pointer is reachable by keyboard, in a predictable order, with a focus indicator that is always visible (never `outline: none` without a replacement). There are zero keyboard traps: focus can always move forward and backward, and modal traps always restore focus to the trigger on close.

### Global keymap

| Keys | Action |
| --- | --- |
| `Tab` / `Shift+Tab` | Move focus forward / backward in DOM order within the active region |
| `Ctrl/Cmd+K` | Open the command palette (every command is here, this is the keyboard escape hatch) |
| `Ctrl/Cmd+1..5` | Jump to a primary region: chat, editor, terminal, swarm, Pixie stage |
| `F6` / `Shift+F6` | Cycle focus between primary regions (landmark rotor for keyboard users) |
| `Esc` | Close the topmost overlay, then clear selection, then blur back to the region |
| `Enter` / `Space` | Activate the focused control; on Pixie or a bubble, open the detail drawer |
| `Ctrl/Cmd+.` | Open the narration log panel (the readable transcript of the stream) |
| `Alt+Z` | Toggle reduced motion |
| `Alt+H` | Cycle theme contrast (normal -> high) |

Region-local keys (Monaco editor, xterm terminal, swarm canvas) are documented in their own specs: [Editor](./EDITOR_SPEC.md), [Terminal](./TERMINAL_SPEC.md), [Swarm](./SWARM_SPEC.md). Within those regions, `Esc` first releases focus to the region container so the user is never stuck inside a grabby widget.

### Roving tabindex for collections

Lists of peers (the event timeline, swarm nodes, todo items, file tree rows) use a single tab stop with arrow-key navigation inside, so `Tab` does not walk hundreds of rows.

```ts
// packages/a11y/src/focus/useRovingTabindex.ts
export function useRovingTabindex(count: number) {
  const [active, setActive] = useState(0);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      setActive((i) => Math.min(i + 1, count - 1)); e.preventDefault();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      setActive((i) => Math.max(i - 1, 0)); e.preventDefault();
    } else if (e.key === 'Home') { setActive(0); e.preventDefault(); }
    else if (e.key === 'End') { setActive(count - 1); e.preventDefault(); }
  };
  // each item: tabIndex = index === active ? 0 : -1
  return { active, onKeyDown };
}
```

### Focus ring and traps

The focus ring is a design token (`--focus-ring`) so it adapts per theme and is thicker and higher-contrast in the high-contrast theme. We use `:focus-visible` so the ring shows for keyboard users without cluttering pointer interaction. Modals, drawers, and the permission prompt use `useFocusTrap`, which traps focus inside the overlay, supports `Esc` to close, and restores focus to the element that opened it.

### Dragging alternatives

Any pointer-drag affordance (resizing panes, dragging Pixie in companion mode, reordering todos) has a keyboard equivalent: focus the handle, then arrow keys move or resize in fixed steps. This satisfies WCAG 2.5.7. Pixie placement in companion mode is also exposed as discrete preset positions selectable from a menu.

## 4. Screen-reader labeling and roles

Every interactive element has an accessible name, every region is a landmark, and every dynamic status uses a live region. We prefer native semantic HTML first and reach for ARIA only when no native element fits. The rule is: **no ARIA is better than bad ARIA**, but every custom control must announce a name, role, and value.

### Landmark structure

```html
<header role="banner">          <!-- session bar, model picker -->
<nav role="navigation">         <!-- region switcher -->
<main>
  <section aria-label="Conversation">       <!-- chat -->
  <section aria-label="Agent stage">         <!-- Pixie + narrated stream -->
  <section aria-label="Editor">              <!-- Monaco -->
  <section aria-label="Terminal">            <!-- xterm -->
  <section aria-label="Swarm">               <!-- subagents -->
</main>
<aside aria-label="Narration log">           <!-- transcript panel -->
<footer role="contentinfo">                   <!-- status, token usage -->
```

### Naming rules

| Surface | Accessible name source |
| --- | --- |
| Icon-only buttons | `aria-label` with a verb phrase (for example "Approve tool call") |
| Pixie sprite | `aria-label` set to the current narration line, updated on each directive |
| Event timeline row | composed label: type + target + relative time (see narrator) |
| Swarm node | `aria-label="Sub-agent {n}, {state}, {lastAction}"` |
| Token usage meter | `aria-label` plus `aria-valuetext` with a spoken number, not just a bar |
| Diff in the detail drawer | `aria-label="Diff for {path}, {added} added, {removed} removed lines"` |

## 5. The narrated event stream

This is the heart of accessible vsclaude. For a sighted user, Pixie acts out the agent; for a non-sighted user, the **narrated stream** voices the same thing in words, in real time, from the same source of truth. There is exactly one caption per applied motion directive, and that caption is both shown on screen and spoken by the screen reader. We never write a separate narration that could drift from the visuals.

```
AgentEvent  -->  mapper  -->  MotionDirective { caption, priority, sourceEventId }
                                   |                         |
                       Pixie animation (visual)     announce() -> aria-live region (spoken)
                                                              |
                                                     narration log panel (readable history)
```

### Live region host

The live region is a visually hidden host with two channels: a polite channel for ordinary flow and an assertive channel for things that demand immediate attention (`permission_request`, `error`). The threshold matches the mascot spec: directives with priority at or above 75 go assertive.

```tsx
// packages/a11y/src/live-region/LiveRegion.tsx
export function LiveRegion() {
  const polite = useAnnouncer('polite');
  const assertive = useAnnouncer('assertive');
  return (
    <>
      <div aria-live="polite" aria-atomic="true" role="status" className="sr-only">
        {polite.text}
      </div>
      <div aria-live="assertive" aria-atomic="true" role="alert" className="sr-only">
        {assertive.text}
      </div>
    </>
  );
}
```

### The announcer: queue, debounce, dedupe

Screen readers clobber a live region if you update it faster than they can speak. The announcer enforces a minimum gap, coalesces a burst into a count, and drops exact duplicates. It also clears and re-sets the text node so identical consecutive strings still announce.

```ts
// packages/a11y/src/live-region/announce.ts
const MIN_GAP_MS = 350;          // do not speak faster than this
const COALESCE_WINDOW_MS = 800;  // collapse a burst into one summary

export class Announcer {
  private queue: string[] = [];
  private last = 0;

  push(text: string, opts: { assertive?: boolean } = {}) {
    if (text === this.queue.at(-1)) return;       // dedupe consecutive
    this.queue.push(text);
    this.flush(opts.assertive ?? false);
  }

  private flush(assertive: boolean) {
    const now = performance.now();
    const wait = Math.max(0, MIN_GAP_MS - (now - this.last));
    setTimeout(() => {
      const batch = this.drainWindow();            // may coalesce to "Edited 4 files"
      this.write(batch, assertive);
      this.last = performance.now();
    }, wait);
  }
  // drainWindow collapses N same-type lines in COALESCE_WINDOW_MS into one summary
}
```

Assertive announcements jump the queue and are never coalesced away; a permission request or an error is always spoken in full.

### Narration log panel

The live region is ephemeral by design (screen readers do not let you scroll back through it). So every narration line is also appended to a persistent, scrollable, focusable **narration log** (`Ctrl/Cmd+.`). It is a `role="log"` list where each row is the narration text plus a relative timestamp, and `Enter` on a row opens the same detail drawer as clicking Pixie. This is the recoverability rule made keyboard-and-screen-reader native: the full agent transcript in plain language, with one keystroke to the raw detail.

## 6. The narration text generator

The generator turns an `AgentEvent` (and its already-computed `caption`, when present) into a clear, non-technical sentence. It is a **pure function**: same event in, same string out, no I/O, fully unit-tested. Captions written by the mapper take priority; the generator fills gaps, expands terse captions for verbose mode, and guarantees every event type has a sentence even if a provider adapter forgot to set a caption.

### Contract

```ts
// packages/a11y/src/narrator/generate.ts
export type Verbosity = 'terse' | 'normal' | 'verbose';

export function narrate(ev: AgentEvent, v: Verbosity): string {
  // 1. If the mapper supplied a caption and verbosity is terse/normal, prefer it.
  // 2. Otherwise build from a per-type template + humanized payload fields.
  // 3. Always return a complete, punctuated, non-technical sentence.
  const base = templates[ev.type]?.(ev, v) ?? fallbackTemplate(ev);
  return v === 'verbose' ? withDetail(base, ev) : base;
}
```

### Templates per event type

Templates speak in plain language, name the subject, and avoid jargon at `normal` verbosity. `verbose` appends the concrete detail (path, command, counts). `terse` keeps it to a few words for power users who want a fast cadence.

| Event type | Normal narration | Verbose adds |
| --- | --- | --- |
| `session_start` | "Pixie is here. The agent is starting." | model and provider name |
| `thinking` | "Thinking about what to do next." | the current goal if known |
| `todo_update` | "Planning. {n} steps, {done} done." | the next step text |
| `file_read` | "Reading {fileName}." | full path and line range |
| `file_edit` | "Editing {fileName}." | "{added} added, {removed} removed lines" |
| `file_create` | "Creating {fileName}." | full path |
| `file_delete` | "Deleting {fileName}." | full path |
| `search` | "Searching for {query}." | match count when result arrives |
| `web_fetch` | "Reading a web page: {host}." | full URL title |
| `command_run` | "Running {commandSummary}." | full command line |
| `command_output` | usually silent (coalesced) | last line of output on demand |
| `git_action` | "Git: {action}." | branch and file count |
| `subagent_spawned` | "Starting a helper to {goal}." | sub-agent id |
| `subagent_finished` | "A helper finished." | which one and result |
| `permission_request` | "Waiting for your approval to {action}." | the exact tool and inputs |
| `token_usage` | silent unless near a limit | "{used} of {limit} tokens used" |
| `error` | "Something went wrong: {shortReason}." | full error text |
| `complete` | "Done." | summary of what changed |

### Humanizing payloads

`humanize.ts` shortens paths to the last one or two segments, summarizes long commands to the program and key flag, pluralizes counts, and strips ANSI from command output. It never invents data: if a field is missing it omits that clause rather than guessing.

```ts
// packages/a11y/src/narrator/humanize.ts
export const fileName = (p: string) => p.split(/[\\/]/).pop() ?? p;

export const commandSummary = (cmd: string) => {
  const [bin, ...rest] = cmd.trim().split(/\s+/);
  const flag = rest.find((t) => t.startsWith('-'));
  return flag ? `${bin} ${flag}` : bin;                 // "pnpm build" -> "pnpm build"
};

export const count = (n: number, one: string, many = one + 's') =>
  `${n} ${n === 1 ? one : many}`;                        // count(1,'file') -> "1 file"
```

### Verbosity policy and rate

`verbosity.ts` chooses how much to speak based on the user setting and the live cadence. Under a flood of events (a long build printing output), narration auto-throttles to summaries ("Running the build, this may take a moment") and announces the result, rather than reading every line. The generator is pure; the throttling lives in the announcer so the generator stays testable.

## 7. Reduced-motion mode

Reduced motion swaps animation for clear, static status while preserving every piece of meaning. It is enabled when the OS reports `prefers-reduced-motion: reduce`, when `forced-colors` is active, or when the user toggles it (`Alt+Z`). The guarantee: **state, mood, intensity, target, caption, and bubbles all still update; only the in-between animation stops.**

### What changes

| Surface | Normal | Reduced motion |
| --- | --- | --- |
| Pixie | Rive plays entry/idle/exit loops | Rive holds the idle pose for the current state, instant cuts between states |
| Sprite fallback | Cycles frames | Pauses on the first idle frame of the state |
| Swarm | Nodes drift and pulse | Nodes are static; status shown by label and badge |
| UI transitions (Motion/GSAP) | Animated | Collapse to `--duration-instant`, no parallax, no autoplay |
| Token meter | Animated fill | Snaps to value |
| Lottie accents | Play | Hidden (decorative only, no meaning lost) |

Because Pixie reads only the design tokens and the `reducedMotion` Rive input, switching modes updates every state automatically with no per-state code. The state label and caption are rendered as visible text beside Pixie in reduced-motion mode, so a sighted user who disabled motion still reads exactly what is happening.

```ts
// the controller mirrors the OS query and the user override into Rive
const reduced = resolvePref(media.prefersReducedMotion(), prefs.reducedMotion);
controller.setReducedMotion(reduced);   // Rive holds poses, sprite pauses
```

```css
@media (prefers-reduced-motion: reduce) {
  :root { --duration-fast: 0ms; --duration-base: 0ms; --duration-slow: 0ms; }
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

Crucially, reduced motion does not silence the narrated stream. The caption flow is identical, so the meaning channel is fully intact whether the animation runs or not.

## 8. High-contrast and color-blind-safe themes

Themes are token-driven and applied with attributes on `:root`, exactly as defined in the [Design System](./DESIGN_SYSTEM.md). Contrast and color-vision safety compose: high contrast is a theme, CVD safety is an orthogonal attribute, so a user can run dark plus CVD-safe or high-contrast plus CVD-safe.

| Mode | Selector | Guarantee |
| --- | --- | --- |
| Dark / Light | `:root[data-theme="dark"|"light"]` | All text and UI meet WCAG AA |
| High contrast | `:root[data-theme="hc"]` | AAA text and non-text contrast, thicker borders, no subtle fills, opaque overlays |
| Color-blind safe | `:root[data-cvd="safe"]` | Status never relies on hue: each status carries an icon and a shape/pattern |
| Forced colors | `@media (forced-colors: active)` | Honor system colors, map roles to `CanvasText`, `Highlight`, etc. |

### No meaning by color alone

This is commitment C5 and it applies everywhere status appears: Pixie moods, swarm node states, diff add/remove, terminal exit codes, permission risk levels. Each status pairs a hue with a redundant, non-color cue.

| Status | Hue role | Redundant cue (always present) |
| --- | --- | --- |
| Success / complete | `sage` | check glyph, solid badge |
| Warning | `amber` | triangle glyph, dashed border |
| Danger / error | `rust` | cross/octagon glyph, double border |
| Info / running | `sky` | spinner-or-dot glyph plus the word in the label |
| Added lines (diff) | green | leading `+` and a left bar texture |
| Removed lines (diff) | red | leading `-` and a left bar texture |

In CVD-safe mode the hues are re-mapped to a color-blind-friendly set and the glyphs and patterns are emphasized so the encoding holds for protanopia, deuteranopia, and tritanopia. The high-contrast theme replaces translucent surfaces with opaque ones so text never sits on a low-contrast blur, and it thickens the focus ring.

```css
:root[data-theme="hc"] {
  --color-bg: #000000;
  --color-fg: #FFFFFF;
  --focus-ring: 3px solid #FFFF00;     /* unmistakable, AAA against black */
  --border-width: 2px;                  /* thicker hairlines */
  --surface-opacity: 1;                 /* no translucency */
}
```

CI verifies every semantic foreground/background pair in every theme against the required ratio (AA for standard themes, AAA for high contrast). A failing pair fails the build (section 12).

## 9. Scalable UI

The UI scales to at least 200 percent without horizontal scrolling, clipping, or loss of content, satisfying WCAG 1.4.10 (reflow) and 1.4.12 (text spacing). This is achieved by sizing in `rem` (never fixed `px` for text), fluid layouts that reflow rather than truncate, and an explicit user scale control on top of the OS text-size setting.

### Rules

- **Text uses `rem`.** The root font size follows the OS/browser setting; the typography scale in the design system is relative, so bumping the root scales everything proportionally.
- **Layouts reflow.** Panes use CSS grid/flex with `min-width: 0` and wrapping, so at 200 percent content stacks instead of overflowing. No essential information lives only in a non-wrapping single line.
- **Hit targets stay large.** Interactive targets are at least 24 by 24 CSS pixels (WCAG 2.5.8), and grow with scale.
- **Pixie and canvases scale by container.** Pixie's stage and the swarm canvas size to their container in `rem`-aware units, so a larger UI scale enlarges them too. The narration text beside Pixie scales with type.
- **User scale control.** A `uiScale` setting (1.0 to 2.0) multiplies the root font size, independent of and on top of the OS zoom, for users who want a larger app without changing the whole OS.

```ts
// applied once at the document root
document.documentElement.style.setProperty('font-size', `${16 * prefs.uiScale}px`);
```

Text spacing overrides (line height 1.5, paragraph spacing 2x font size, letter spacing 0.12em, word spacing 0.16em) must not clip or overlap content; this is tested with the standard text-spacing bookmarklet values in CI.

## 10. ARIA patterns per region

Concrete patterns each region implements. These follow the WAI-ARIA Authoring Practices; deviations are noted.

### Chat / conversation

`role="log"` on the message list, each message a `role="article"` with an accessible name "{role} message at {time}". Streaming assistant text updates a `aria-live="polite"` region scoped to the in-progress message so a screen reader hears the answer as it arrives without re-reading the whole thread. The input is a labeled `textarea` with an `aria-describedby` hint for the send shortcut.

### Pixie stage and narrated stream

Pixie is a focusable `img`-like element with `role="img"` and an `aria-label` equal to the current narration line, kept in sync on each directive. The live region (section 5) carries the running narration. Pixie's container is labeled "Agent stage". `Enter` opens the detail drawer for the current `sourceEventId`.

### Swarm

`role="tree"` or a labeled list of `role="treeitem"` nodes for the agent hierarchy, with `aria-expanded` on parents and `aria-level` for depth. Each node's `aria-label` names the sub-agent, its state, and its last action. Arrow keys navigate (roving tabindex); the canvas is a redundant visual layer, the tree is the accessible truth.

### Permission request

The most safety-critical announcement. It renders as a `role="alertdialog"` with `aria-modal="true"`, traps focus, is announced assertively, and names the exact tool and inputs in its accessible description. The default focused control is the safe choice (deny/cancel), never the approve button. See [Permissions and Safety](./PERMISSIONS_AND_SAFETY.md).

```tsx
<div role="alertdialog" aria-modal="true"
     aria-labelledby="perm-title" aria-describedby="perm-detail">
  <h2 id="perm-title">Approval needed</h2>
  <p id="perm-detail">{narrate(permissionEvent, 'verbose')}</p>
  <button ref={defaultFocus}>Deny</button>
  <button>Approve once</button>
</div>
```

### Terminal and editor

xterm.js runs with its screen-reader mode enabled so output reaches assistive tech; the container is labeled and the keyboard help is discoverable. Monaco ships robust ARIA already; we keep its accessibility help reachable, ensure the diff view exposes added/removed counts in its label, and never trap focus (`Esc` then `Tab` always escapes the editor). Both are documented further in [Terminal](./TERMINAL_SPEC.md) and [Editor](./EDITOR_SPEC.md).

### Status and meters

Token usage and progress use `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and a human `aria-valuetext` ("12 thousand of 200 thousand tokens used"). Status messages that should not steal focus use `role="status"` (polite); ones that must interrupt use `role="alert"` (assertive).

## 11. Settings surface

Accessibility settings live in one panel, each reading its OS default and allowing an explicit override that persists. The panel is itself fully keyboard and screen-reader operable and previews changes live.

| Setting | Values | Default | Persisted key |
| --- | --- | --- | --- |
| Reduced motion | follow OS / on / off | follow OS | `a11y.reducedMotion` |
| Contrast | follow OS / normal / high | follow OS | `a11y.contrast` |
| Color-blind safe | off / on | off | `a11y.cvdSafe` |
| Narration | off / terse / normal / verbose | normal | `a11y.narration` |
| UI scale | 1.0 to 2.0 | 1.0 | `a11y.uiScale` |
| Sound cues | off / on | off | `a11y.sound` |

Optional sound cues (Tone.js, off by default) are an additive non-visual channel: short distinct tones for waiting, error, and complete. They are never the only signal for anything; the narrated stream remains the primary non-visual channel.

## 12. Testing and CI gates

Accessibility is enforced, not hoped for. These gates run in CI and block merge on regression.

| Gate | Tool | What it checks |
| --- | --- | --- |
| Automated audit | `axe-core` via Vitest + Playwright | No critical/serious violations on any route or Storybook story |
| Contrast | token contrast script | Every semantic fg/bg pair meets AA (AAA for `hc`) in every theme |
| Keyboard e2e | Playwright | Every primary flow completes with keyboard only; focus is visible; no trap |
| Reduced motion | Playwright with emulated `prefers-reduced-motion` | No looping animation runs; captions and status still update |
| Narrator unit | Vitest | Every `AgentEventType` yields a complete sentence at each verbosity; pure and deterministic |
| Live region | Vitest (jsdom) | Announcer dedupes, debounces, coalesces, and routes priority correctly |
| CVD | Storybook + simulated CVD snapshot | Status remains distinguishable without hue (icon/shape present) |
| Reflow | Playwright at 200 percent zoom and text-spacing overrides | No clipping, no horizontal scroll, no lost content |

```ts
// packages/a11y/src/testing/axe.ts
import { axe } from 'jest-axe';
export async function expectNoA11yViolations(node: HTMLElement) {
  const results = await axe(node, {
    rules: { 'color-contrast': { enabled: true } },
  });
  expect(results.violations).toEqual([]);
}
```

A representative narrator test asserts coverage of the full event union so a new event type cannot ship without a narration template:

```ts
import { ALL_EVENT_TYPES } from '@vsclaude/contracts';
test.each(ALL_EVENT_TYPES)('narrates %s at every verbosity', (type) => {
  for (const v of ['terse', 'normal', 'verbose'] as const) {
    const s = narrate(makeEvent(type), v);
    expect(s).toMatch(/[.?!]$/);   // a real, punctuated sentence
    expect(s.length).toBeGreaterThan(0);
  }
});
```

## 13. Definition of done checklist

A feature is accessible-done only when all of these hold. Reviewers check this list on every PR that touches UI or the event stream.

- [ ] Operable with keyboard alone, with a visible focus ring and no trap.
- [ ] Every interactive element has an accessible name and correct role.
- [ ] Any new `AgentEventType` has a narration template at all three verbosities, with a passing test.
- [ ] New dynamic status is announced via the correct live region (polite vs assertive).
- [ ] Works fully in reduced-motion mode with no meaning lost.
- [ ] Carries a non-color cue (icon plus shape or text) for every status it shows.
- [ ] Passes contrast in dark, light, high-contrast, and CVD-safe modes.
- [ ] Reflows cleanly at 200 percent scale with text-spacing overrides applied.
- [ ] `axe-core` reports zero critical or serious violations.
- [ ] Any pointer-drag affordance has a documented keyboard equivalent.

Accessibility in vsclaude is the same promise as the product itself, restated for every sense and every input device: bound to real events, meaning always recoverable, and always followable in plain language. The narrated stream is where the third sacred motion rule and screen-reader support become one feature. Build it once, route every caption through it, and the app speaks to everyone.
