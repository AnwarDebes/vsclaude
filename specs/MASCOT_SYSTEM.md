# Mascot System (Pixie)

Pixie is the living pixel-art companion at the heart of vsclaude. She is the visual narrator of the agent: every move she makes is bound to a real [AgentEvent](./AGENT_EVENT.md), one click always recovers the underlying detail, and a plain-language caption travels with every state so a non-technical viewer can follow along. This document is the complete contract for the Pixie subsystem: the Rive state machine and its inputs, every animation state with entry/idle/exit blends and caption examples, the pure event-to-motion mapper (`mapEvents`), debouncing, prioritization, dwell, gaze, intensity, moods, bubble templating, the five presentation modes, the sprite-sheet fallback, accessibility hooks, and the unit-test matrix the mapper must pass.

## Table of contents

- [1. Design principles](#1-design-principles)
- [2. Package layout](#2-package-layout)
- [3. Rive state machine](#3-rive-state-machine)
- [4. Pixie states](#4-pixie-states)
- [5. Moods and intensity](#5-moods-and-intensity)
- [6. Gaze targeting](#6-gaze-targeting)
- [7. The event-to-motion mapper](#7-the-event-to-motion-mapper)
- [8. Prioritization, dwell, and debounce](#8-prioritization-dwell-and-debounce)
- [9. Thought and speech bubbles](#9-thought-and-speech-bubbles)
- [10. Presentation modes](#10-presentation-modes)
- [11. Sprite-sheet fallback](#11-sprite-sheet-fallback)
- [12. Accessibility hooks](#12-accessibility-hooks)
- [13. Mapper pseudocode](#13-mapper-pseudocode)
- [14. Unit-test matrix](#14-unit-test-matrix)

## 1. Design principles

The mascot subsystem obeys the three sacred motion rules:

1. **Bound to real events.** Pixie consumes only the normalized `AgentEvent` stream. There is no decorative or random animation. If she types, a `file_edit` or `file_create` event is flowing and the target path is on the directive.
2. **Meaning is recoverable.** Every `MotionDirective` carries the `sourceEventId` that produced it. One click on Pixie or her caption drills into the exact tool, input, diff, command, or raw output.
3. **Plain-language captions.** Every directive has a `caption`. Captions are written for a non-technical reader and are also fed to the screen reader live region.

A fourth engineering principle governs the code: **the mapper is pure**. `mapEvents` is a deterministic function of its inputs (the event plus the mapper's own carried state). It performs no I/O, reads no clock except a `now` passed in, and is fully unit-testable. All timing side effects (timers, debouncing) live in a thin scheduler around it.

## 2. Package layout

```
packages/
  mascot/
    src/
      mapper.ts            # pure mapEvents + reducer
      scheduler.ts         # timers, debounce, dwell enforcement
      directives.ts        # MotionDirective + PixieState types
      intensity.ts         # rolling-window intensity computation
      gaze.ts              # path -> targetX/targetY resolver
      bubbles.ts           # thought/speech templating
      moods.ts             # mood derivation
      rive/
        PixieController.ts  # binds directives to Rive inputs
        SpriteFallback.ts   # canvas sprite-sheet animator
      modes/
        Companion.tsx Stage.tsx Swarm.tsx Minimal.tsx Cozy.tsx
    assets/
      pixie.riv
      pixie-spritesheet.png
      pixie-spritesheet.json
```

`packages/mascot` depends only on `packages/contracts` (for `AgentEvent`). It has no dependency on Rust, Monaco, or the terminal. This keeps it portable and unit-testable in isolation. See [Architecture](./ARCHITECTURE.md) for where the package sits in the dependency graph.

## 3. Rive state machine

The Rive file `pixie.riv` exposes a single state machine named `Pixie` with the following inputs. The controller writes these inputs; Rive blends transitions internally.

| Input | Rive type | Range / values | Meaning |
| --- | --- | --- | --- |
| `state` | number (enum) | 0..16 | The active Pixie state, indexed per the table in section 4 |
| `mood` | number (enum) | 0..3 | `calm`=0, `focused`=1, `excited`=2, `struggling`=3 |
| `intensity` | number | 0..1 | How much is happening; scales animation speed and amplitude |
| `targetX` | number | -1..1 | Horizontal gaze and lean target, 0 is center |
| `targetY` | number | -1..1 | Vertical gaze target, 0 is center |
| `trigger` | trigger | pulse | Fired on each state change to force entry blend even when re-entering the same state |
| `reducedMotion` | boolean | true/false | When true, Rive holds idle poses and skips loops |

`state` and `mood` are nested enum inputs so the artist can layer a mood blend on any state without a combinatorial explosion of states. `intensity` drives a single blend node that the state machine multiplies into playback speed and motion amplitude. The `PixieController` is the only writer:

```ts
// packages/mascot/src/rive/PixieController.ts
import type { MotionDirective } from '../directives';

export class PixieController {
  constructor(private sm: RiveStateMachine) {}

  apply(d: MotionDirective): void {
    this.sm.number('intensity').value = d.intensity;
    this.sm.number('mood').value = MOOD_INDEX[d.mood];
    this.sm.number('targetX').value = d.gaze.x;
    this.sm.number('targetY').value = d.gaze.y;
    const next = STATE_INDEX[d.state];
    if (this.sm.number('state').value !== next) {
      this.sm.number('state').value = next;
      this.sm.trigger('trigger').fire(); // force entry blend
    }
  }

  setReducedMotion(on: boolean): void {
    this.sm.boolean('reducedMotion').value = on;
  }
}
```

## 4. Pixie states

Each state has three timeline regions inside Rive: an **entry** blend played once when the state becomes active, an **idle** loop that plays while the state holds, and an **exit** blend played as the machine transitions out. Entry and exit are short (120 to 280 ms) so transitions feel snappy but never jarring. The caption examples below are the default templates; section 9 covers how runtime data is interpolated.

| # | State | Trigger event | Entry | Idle loop | Exit | Caption example |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | `greeting` | `session_start` | wave in, eyes open | gentle bob, blink | settle | "Pixie is ready to help." |
| 1 | `idle` | no activity | ease to neutral | breathing, occasional blink | lean toward next task | "Waiting for the next step." |
| 2 | `sleeping` | long idle (> 90s) | yawn, sit down | slow z-bubbles | wake, stretch | "Resting until there is work." |
| 3 | `thinking` | `thinking` | hand to chin | thought bubble pulse | drop hand | "Thinking about how to solve this." |
| 4 | `planning` | `todo_update` | pull out checklist | tick items, nod | roll up list | "Planning the steps to take." |
| 5 | `reading` | `file_read` | open a scroll | eyes scan left to right | close scroll | "Reading {file}." |
| 6 | `typing` | `file_edit`, `file_create` | sit at tiny keyboard | rapid key taps | lift hands | "Editing {file}." |
| 7 | `searching` | `search` | raise magnifier | sweep magnifier | lower it | "Searching for \"{query}\"." |
| 8 | `web` | `web_fetch` | open a window | globe spins | close window | "Looking something up online." |
| 9 | `running` | `command_run` | grab a wrench | gears turn | set down wrench | "Running {command}." |
| 10 | `debugging` | `error` during a run | furrow brow, bug appears | poke at the bug | bug fades | "Working through an error." |
| 11 | `building` | long `command_run` (build) | roll up sleeves | hammer and sparks | wipe brow | "Building the project." |
| 12 | `git` | `git_action` | pick up a branch | prune and graft | tuck branch away | "Saving work with git." |
| 13 | `spawning` | `subagent_spawned` | conjure a helper | helpers orbit | helpers settle | "Sending out {n} helpers." |
| 14 | `waiting` | `permission_request` | freeze, look up | tap foot, question mark | resume | "Waiting for your approval." |
| 15 | `success` | `complete` | jump for joy | confetti, grin | settle to idle | "All done." |
| 16 | `confused` | unresolved `error` | scratch head | shrug loop | sigh | "Stuck on a problem." |

The numeric column is the canonical `STATE_INDEX`. It is frozen: appending new states is allowed, reordering is not, because saved Rive enum values map by index.

## 5. Moods and intensity

Mood is a layer on top of state. The same `typing` state reads very differently in `calm` versus `struggling`. Mood is derived from the recent event window, not from any single event.

```ts
// packages/mascot/src/moods.ts
export type Mood = 'calm' | 'focused' | 'excited' | 'struggling';

export function deriveMood(w: Window): Mood {
  if (w.errorRate > 0.34 || w.consecutiveErrors >= 2) return 'struggling';
  if (w.lastType === 'complete') return 'excited';
  if (w.eventsPerSec >= 2) return 'focused';
  return 'calm';
}
```

`intensity` is a continuous 0..1 value computed from how dense the event stream is. It scales Rive playback speed and amplitude so a quiet session feels gentle and a busy session feels alive without changing state.

```ts
// packages/mascot/src/intensity.ts
// Rolling window: count weighted events in the last INTENSITY_WINDOW_MS.
const INTENSITY_WINDOW_MS = 4000;
const SATURATION = 8; // weighted events that map to intensity 1.0

const WEIGHT: Partial<Record<AgentEventType, number>> = {
  file_edit: 1.0, file_create: 1.0, command_run: 1.2,
  tool_call: 0.8, search: 0.6, thinking: 0.3, message: 0.2,
  token_usage: 0.05, error: 1.5, subagent_spawned: 1.4,
};

export function intensity(window: TimedEvent[], now: number): number {
  let sum = 0;
  for (const e of window) {
    if (now - e.ts > INTENSITY_WINDOW_MS) continue;
    const age = (now - e.ts) / INTENSITY_WINDOW_MS; // 0 fresh .. 1 stale
    sum += (WEIGHT[e.type] ?? 0.4) * (1 - age);     // linear decay
  }
  return Math.min(1, sum / SATURATION);
}
```

Intensity is recomputed on every event and also on a 250 ms heartbeat so it decays smoothly toward zero when the stream goes quiet. Decay is the only reason the scheduler ticks without an event.

## 6. Gaze targeting

`targetX` and `targetY` let Pixie look at the thing she is acting on. The gaze resolver maps a workspace path or a UI region to a point in -1..1 space. The host supplies a `GazeMap` describing where panels and the file tree live on screen; the resolver normalizes a target into Pixie-local coordinates.

```ts
// packages/mascot/src/gaze.ts
export interface Gaze { x: number; y: number }

export function resolveGaze(d: Partial<MotionDirective>, map: GazeMap): Gaze {
  // File operations: look toward the file's row in the tree, or the editor.
  if (d.targetPath) {
    const row = map.fileTreeRowFor(d.targetPath);
    if (row) return clampGaze(row);
    return clampGaze(map.editor);
  }
  if (d.state === 'running' || d.state === 'building') return clampGaze(map.terminal);
  if (d.state === 'web') return clampGaze(map.topRight);
  if (d.state === 'spawning') return clampGaze(map.swarm);
  if (d.state === 'waiting') return clampGaze(map.center); // look at the user
  return { x: 0, y: 0 };
}

const clampGaze = (g: Gaze): Gaze => ({
  x: Math.max(-1, Math.min(1, g.x)),
  y: Math.max(-1, Math.min(1, g.y)),
});
```

Gaze changes are smoothed by Rive's own input interpolation, so the controller can write target values directly without easing them in JavaScript. When no target applies, gaze returns to center.

## 7. The event-to-motion mapper

The mapper is the core of the subsystem. It is a pure reducer: given the current `MapperState` and one `AgentEvent`, it returns the next `MapperState` plus zero or one `MotionDirective`. The scheduler calls it, applies timing rules, and pushes directives to the controller.

```ts
// packages/mascot/src/directives.ts
export type PixieState =
  | 'greeting' | 'idle' | 'sleeping' | 'thinking' | 'planning'
  | 'reading' | 'typing' | 'searching' | 'web' | 'running'
  | 'debugging' | 'building' | 'git' | 'spawning' | 'waiting'
  | 'success' | 'confused';

export interface MotionDirective {
  state: PixieState;
  mood: Mood;
  intensity: number;          // 0..1
  gaze: Gaze;                  // -1..1 each axis
  caption: string;            // plain-language, recoverable
  bubble?: Bubble;            // optional thought/speech bubble
  priority: number;           // 0 lowest .. 100 highest
  minDwellMs: number;         // floor on how long this directive holds
  sourceEventId: string;      // recoverability: click drills to this event
  targetPath?: string;        // for gaze + caption interpolation
}
```

The base event-to-state map is a static table. Mood, intensity, gaze, and captions are layered on after the base lookup.

| Event type | Base state | Priority | minDwell (ms) | Notes |
| --- | --- | --- | --- | --- |
| `session_start` | greeting | 60 | 1200 | Plays once per session |
| `session_end` | idle | 20 | 0 | Then decays to sleeping |
| `thinking` | thinking | 30 | 400 | Coalesced if repeated |
| `message` | (no state change) | 10 | 0 | Drives speech bubble only |
| `tool_call` | derived by tool name | 40 | 300 | Maps Grep to searching, Bash to running, etc. |
| `tool_result` | (hold) | 15 | 0 | Updates caption/bubble, no state flip |
| `file_read` | reading | 35 | 350 | gaze to file |
| `file_edit` | typing | 45 | 450 | gaze to file |
| `file_create` | typing | 45 | 450 | gaze to file |
| `file_delete` | typing | 45 | 450 | caption says "Removing {file}" |
| `command_run` | running | 50 | 500 | building if heuristic matches build cmd |
| `command_output` | (hold) | 15 | 0 | error in output can flip to debugging |
| `search` | searching | 35 | 350 | |
| `web_fetch` | web | 35 | 400 | |
| `git_action` | git | 45 | 500 | |
| `subagent_spawned` | spawning | 70 | 600 | increments helper count |
| `subagent_finished` | (hold) | 20 | 0 | decrements helper count |
| `todo_update` | planning | 40 | 600 | |
| `permission_request` | waiting | 100 | 800 | always wins, see section 8 |
| `token_usage` | (no state change) | 5 | 0 | updates HUD only |
| `error` | debugging or confused | 75 | 700 | confused if unresolved after retries |
| `complete` | success | 65 | 1000 | then decays to idle |

Tool-call name mapping (the `tool_call` derivation) for the Claude Code adapter:

```ts
const TOOL_TO_STATE: Record<string, PixieState> = {
  Read: 'reading', Edit: 'typing', Write: 'typing', MultiEdit: 'typing',
  Grep: 'searching', Glob: 'searching',
  Bash: 'running', WebFetch: 'web', WebSearch: 'searching',
  Task: 'spawning', TodoWrite: 'planning',
};
```

## 8. Prioritization, dwell, and debounce

Three timing rules turn a noisy stream into legible motion. They live in the scheduler, never in the pure mapper.

**Prioritization.** Each directive carries a `priority`. A new directive replaces the current one only if `new.priority >= current.priority` OR the current directive's `minDwell` has elapsed. `permission_request` has priority 100, the maximum, so it preempts everything instantly and cannot be preempted by anything except a newer `permission_request` or a `complete`/`error` that resolves it. This guarantees the user is never left unaware that the agent is blocked on their approval.

**Minimum dwell.** Every state has a `minDwellMs` floor (column above). A lower-or-equal priority directive arriving before the floor is queued, not dropped, then applied when the floor elapses. The latest queued directive wins; intermediate ones are coalesced. This prevents flicker when, for example, ten `file_edit` events stream in 30 ms apart: Pixie stays in `typing` and only the caption and intensity update.

**Debounce and coalescing.** Same-state repeats within `DEBOUNCE_MS` (120 ms) do not restart the entry blend; they only refresh caption, gaze, and intensity. Rapid alternation between two states within `COALESCE_MS` (250 ms) collapses to the higher-priority of the two to avoid a seizure of entry blends.

```
event ─▶ mapEvents (pure) ─▶ directive
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │ scheduler                  │
                    │  if higher priority OR     │
                    │     dwell elapsed -> apply │
                    │  else queue (coalesce)     │
                    │  debounce same-state       │
                    └───────────────────────────┘
                                  │
                                  ▼
                         PixieController.apply
```

State decay: when no event arrives, the scheduler's heartbeat advances an idle timer. After `IDLE_MS` (10s) Pixie eases to `idle`; after `SLEEP_MS` (90s) she eases to `sleeping`. `success` and `greeting` auto-decay to `idle` after their dwell so she does not celebrate forever.

## 9. Thought and speech bubbles

Bubbles are the bridge to plain language and to recoverability. A **thought bubble** shows what Pixie is doing (interpolated from the event). A **speech bubble** shows agent `message` text, truncated.

```ts
// packages/mascot/src/bubbles.ts
export type BubbleKind = 'thought' | 'speech';
export interface Bubble {
  kind: BubbleKind;
  text: string;        // already interpolated and truncated
  ttlMs: number;       // auto-dismiss
  sourceEventId: string;
}

const TEMPLATES: Partial<Record<AgentEventType, string>> = {
  file_read:   'Reading {fileBase}',
  file_edit:   'Editing {fileBase}',
  file_create: 'Creating {fileBase}',
  file_delete: 'Removing {fileBase}',
  search:      'Searching for "{query}"',
  command_run: 'Running {cmdShort}',
  web_fetch:   'Reading {host}',
  git_action:  '{gitVerb} with git',
  permission_request: 'Needs your approval to {action}',
};

export function buildBubble(e: AgentEvent): Bubble | undefined {
  if (e.type === 'message') {
    const text = truncate(String(e.payload?.text ?? ''), 140);
    return { kind: 'speech', text, ttlMs: 6000, sourceEventId: e.id };
  }
  const tpl = TEMPLATES[e.type];
  if (!tpl) return undefined;
  return {
    kind: 'thought',
    text: interpolate(tpl, fields(e)),
    ttlMs: 4000,
    sourceEventId: e.id,
  };
}
```

Interpolation helpers derive `fileBase` from the path's basename, `cmdShort` from the first token of the command (with the rest available on drill-in), and `host` from a fetched URL. The full untruncated values stay on `e.payload` and `e.raw`, so clicking the bubble opens the detail drawer with the complete tool input, diff, or output. This is motion rule 2 made concrete.

## 10. Presentation modes

The same directive stream renders into five modes. Modes are pure view layers over `MotionDirective`; they never alter mapper logic.

| Mode | Layout | When to use | Pixie size | Bubbles | Swarm |
| --- | --- | --- | --- | --- | --- |
| **Companion** | Pixie docked in a side rail beside the editor | Default daily driving | small | thought + speech | collapsed count badge |
| **Stage** | Pixie centered on a backdrop, captions large | Demos, pairing, screen share | large | both, prominent | orbiting helpers |
| **Swarm** | Multi-agent canvas, one sprite per `agentId` | Many subagents running | each small | thought only | full, PixiJS canvas |
| **Minimal** | A single status pip plus one-line caption | Power users, low distraction | tiny | one-line caption | hidden |
| **Cozy** | Warm scene, slow ambient idle, soft palette | Long waits, builds, resting | medium | gentle thought | dimmed |

Mode selection rules: the user can pin any mode. In `auto` (default), the scheduler suggests **Swarm** when active helper count >= 2, **Cozy** when intensity has been < 0.1 for over 30s, and **Companion** otherwise. **Stage** and **Minimal** are user-only choices, never auto-selected.

```ts
function suggestMode(s: MapperState, now: number): Mode {
  if (s.helperCount >= 2) return 'swarm';
  if (now - s.lastBusyTs > 30_000 && s.intensity < 0.1) return 'cozy';
  return 'companion';
}
```

In **Swarm** mode each `agentId` gets its own lightweight Pixie instance. Subagent directives are routed by `agentId`; the root agent keeps the main sprite. Helpers fade in on `subagent_spawned` and fade out on `subagent_finished`. The swarm view is what the `Task` tool spawning subagents brings to life automatically.

## 11. Sprite-sheet fallback

When Rive cannot load (asset failure, unsupported GPU, or a forced flag), the controller falls back to a deterministic sprite-sheet animator that honors the same `MotionDirective`. The fallback is feature-equivalent for state, intensity, and reduced motion; it approximates mood with palette swaps and skips fine gaze (it flips horizontally toward the gaze sign only).

```ts
// packages/mascot/src/rive/SpriteFallback.ts
interface Clip { row: number; frames: number; fps: number; loop: boolean }

const CLIPS: Record<PixieState, { entry?: Clip; idle: Clip; exit?: Clip }> = {
  typing:  { entry: { row: 0, frames: 2, fps: 12, loop: false },
             idle:  { row: 0, frames: 6, fps: 12, loop: true } },
  reading: { idle:  { row: 1, frames: 4, fps: 6,  loop: true } },
  // ... one entry per state, indexed identically to STATE_INDEX
};

export class SpriteFallback {
  apply(d: MotionDirective, ctx: CanvasRenderingContext2D): void {
    const clip = CLIPS[d.state];
    this.play(clip, ctx, {
      speed: 0.6 + d.intensity * 0.8,   // intensity scales fps
      flipX: d.gaze.x < -0.2,
      palette: PALETTE[d.mood],
      paused: this.reducedMotion,        // hold first idle frame
    });
  }
}
```

The sprite sheet (`pixie-spritesheet.png` plus `pixie-spritesheet.json` frame metadata) is authored alongside the Rive file and kept in lockstep: any new state must add both a Rive enum value and a sprite row. CI verifies the two asset manifests agree (a Storybook story renders every state in both renderers side by side).

## 12. Accessibility hooks

Accessibility is a product pillar, not an afterthought. The mascot subsystem exposes three hooks.

**Narrated stream.** Every applied directive's `caption` is written to an `aria-live="polite"` region. High-priority directives (`permission_request`, `error`) use `aria-live="assertive"` so a screen reader announces them immediately. The narrated stream is the same text non-technical viewers read, so there is one source of truth.

```tsx
<div aria-live={directive.priority >= 75 ? 'assertive' : 'polite'}
     className="sr-only">
  {directive.caption}
</div>
```

**Reduced motion.** When `prefers-reduced-motion: reduce` is set, or the user toggles it, the controller writes `reducedMotion=true` to Rive (which holds idle poses and skips loops) and the sprite fallback pauses on the first idle frame. State, mood, intensity, gaze, captions, and bubbles all still update, so meaning is fully preserved without animation. Entry and exit blends are replaced by an instant cut.

**Keyboard and focus.** Pixie and every bubble are focusable. `Enter` or `Space` on Pixie opens the detail drawer for the current `sourceEventId`. Bubbles expose the same drill-in. Focus order follows the visual order in each mode. All captions meet WCAG AA contrast against their backdrops in every mode, including Cozy's warm palette.

| Hook | Trigger | Effect |
| --- | --- | --- |
| Narrated stream | every directive | caption to live region (polite/assertive by priority) |
| Reduced motion | OS setting or user toggle | hold poses, instant cuts, data still updates |
| Keyboard drill-in | focus + Enter/Space | opens detail drawer at `sourceEventId` |

## 13. Mapper pseudocode

The full pure mapper. It carries a small `MapperState` (recent window, helper count, last state, idle timers) and returns the next state plus an optional directive. All timing decisions are deferred to the scheduler.

```ts
// packages/mascot/src/mapper.ts
export interface MapperState {
  window: TimedEvent[];     // bounded ring buffer (last INTENSITY_WINDOW_MS)
  helperCount: number;
  lastState: PixieState;
  consecutiveErrors: number;
  resolved: boolean;        // did a complete follow the last error
  lastBusyTs: number;
}

export function mapEvents(
  state: MapperState,
  e: AgentEvent,
  map: GazeMap,
  now: number,
): { state: MapperState; directive?: MotionDirective } {
  const window = pushWindow(state.window, { type: e.type, ts: e.ts }, now);

  // 1. base state from the static table + tool-name derivation
  let pixie = baseState(e);

  // 2. error escalation: 2+ consecutive unresolved errors -> confused
  let consecutiveErrors = state.consecutiveErrors;
  let resolved = state.resolved;
  if (e.type === 'error') {
    consecutiveErrors += 1;
    resolved = false;
    pixie = consecutiveErrors >= 2 ? 'confused' : 'debugging';
  } else if (e.type === 'complete') {
    consecutiveErrors = 0;
    resolved = true;
  }

  // 3. helper bookkeeping for swarm + spawning caption
  let helperCount = state.helperCount;
  if (e.type === 'subagent_spawned') helperCount += 1;
  if (e.type === 'subagent_finished') helperCount = Math.max(0, helperCount - 1);

  // 4. events that change no state: emit caption/bubble updates only
  if (pixie === undefined) {
    const bubble = buildBubble(e);
    const next = { ...state, window, helperCount, consecutiveErrors, resolved };
    if (!bubble) return { state: next };
    return {
      state: next,
      directive: holdDirective(state.lastState, bubble, e, map, window, now),
    };
  }

  // 5. assemble the directive
  const mood = deriveMood(buildWindowStats(window, consecutiveErrors, e));
  const directive: MotionDirective = {
    state: pixie,
    mood,
    intensity: intensity(window, now),
    gaze: resolveGaze({ state: pixie, targetPath: pathOf(e) }, map),
    caption: caption(pixie, e),
    bubble: buildBubble(e),
    priority: PRIORITY[e.type],
    minDwellMs: MIN_DWELL[pixie],
    sourceEventId: e.id,
    targetPath: pathOf(e),
  };

  return {
    state: {
      window, helperCount, consecutiveErrors, resolved,
      lastState: pixie,
      lastBusyTs: isBusy(e) ? now : state.lastBusyTs,
    },
    directive,
  };
}
```

The scheduler wraps this:

```ts
// packages/mascot/src/scheduler.ts (timing side effects live here)
onEvent(e: AgentEvent) {
  const { state, directive } = mapEvents(this.state, e, this.map, this.clock.now());
  this.state = state;
  if (!directive) return;

  const cur = this.current;
  const dwellElapsed = this.clock.now() - this.appliedAt >= (cur?.minDwellMs ?? 0);

  if (!cur || directive.priority >= cur.priority || dwellElapsed) {
    this.applyNow(directive);            // debounce same-state inside applyNow
  } else {
    this.queueLatest(directive);         // coalesce: keep only the newest
  }
}

tick() { // 250 ms heartbeat: decay intensity, idle/sleep, flush dwell queue
  this.decayIntensity();
  this.maybeIdleOrSleep();
  this.flushDwellQueueIfElapsed();
}
```

## 14. Unit-test matrix

The mapper and scheduler must pass this matrix (Vitest). The mapper tests are pure and deterministic; scheduler tests use a fake clock.

| # | Scenario | Input sequence | Expected outcome |
| --- | --- | --- | --- |
| 1 | Cold start | `session_start` | directive state `greeting`, priority 60, dwell 1200, caption "ready" |
| 2 | Single edit | `file_edit{path}` | state `typing`, gaze toward path, caption "Editing {base}" |
| 3 | Edit burst | 10x `file_edit` in 300 ms | stays `typing`, one entry blend, caption follows last file, intensity rises |
| 4 | Permission preempts | `command_run` then `permission_request` | flips to `waiting` immediately despite running's dwell |
| 5 | Permission not preempted | `permission_request` then `file_read` | stays `waiting` until resolved (priority floor holds) |
| 6 | Permission resolved | `permission_request` then `complete` | leaves `waiting`, goes `success` |
| 7 | One error | `command_run` then `error` | state `debugging`, mood not yet `struggling` |
| 8 | Two errors | `error`, `error` | state `confused`, mood `struggling` |
| 9 | Error then fix | `error`, `complete` | `consecutiveErrors` resets to 0, mood `excited`, state `success` |
| 10 | Subagent fan-out | 3x `subagent_spawned` | `helperCount`=3, state `spawning`, caption "3 helpers", suggestMode `swarm` |
| 11 | Subagent drain | 3 spawned then 3 finished | `helperCount`=0, suggestMode leaves `swarm` |
| 12 | Idle decay | no events for IDLE_MS | tick produces `idle` |
| 13 | Sleep decay | no events for SLEEP_MS | tick produces `sleeping` |
| 14 | Success auto-decay | `complete`, wait past dwell | decays from `success` to `idle` |
| 15 | Intensity decay | busy burst then silence | intensity monotonically decreases to ~0 over the window |
| 16 | Tool-name map | `tool_call{name:Grep}` | state `searching`; `name:Bash` -> `running`; `name:Task` -> `spawning` |
| 17 | Message no flip | `file_edit` then `message` | state stays `typing`, speech bubble appears, no entry re-blend |
| 18 | Recoverability | any directive | `sourceEventId` equals the source event's `id` |
| 19 | Reduced motion | flag on | controller writes `reducedMotion=true`, directives still carry data |
| 20 | Build heuristic | `command_run{cmd:"pnpm build"}` | state `building`, not plain `running` |
| 21 | Coalesce flicker | alternate `reading`/`typing` within COALESCE_MS | collapses to higher priority (`typing`), single blend |
| 22 | Gaze fallback | event with no path, state `running` | gaze toward terminal region, not center |
| 23 | Caption truncation | `message` with 500 chars | speech bubble text length <= 140 |
| 24 | Frozen index | snapshot of `STATE_INDEX` | matches the locked table in section 4 |

Every Pixie state additionally has a Storybook story rendering its entry, idle, and exit in both the Rive renderer and the sprite fallback, with the caption shown, so reviewers can eyeball parity. The frozen `STATE_INDEX` snapshot test (row 24) guards against accidental reordering that would corrupt saved Rive enums.

## Related specs

- [Architecture](./ARCHITECTURE.md)
- [Agent Event Schema](./AGENT_EVENT.md)
- [Providers and Adapters](./PROVIDERS.md)
- [Presentation and Modes](./PRESENTATION.md)
- [Accessibility](./ACCESSIBILITY.md)
