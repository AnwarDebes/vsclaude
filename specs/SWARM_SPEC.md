# SWARM_SPEC

The swarm is vsclaude's orchestration view: a living workshop where an orchestrator Pixie delegates work to worker Pixies, each acting out the real activity of one agent in the delegation tree. This spec defines how `subagent_spawned` and `subagent_finished` events construct that tree, how the workshop scene renders it, how a user zooms into a single agent's full activity, how the timeline scrubber replays a session, how the view degrades gracefully from a handful of agents to hundreds, and how per-agent and aggregate token and cost meters are computed. Everything here consumes only the frozen [`AgentEvent`](../packages/contracts/src/agent-event.ts) stream. No provider details leak into this module.

## Table of contents

1. [Scope and non-goals](#1-scope-and-non-goals)
2. [The agent tree data model](#2-the-agent-tree-data-model)
3. [Building the tree from events](#3-building-the-tree-from-events)
4. [The workshop scene](#4-the-workshop-scene)
5. [Hand-off and dissolve choreography](#5-hand-off-and-dissolve-choreography)
6. [Click to zoom: single-agent activity](#6-click-to-zoom-single-agent-activity)
7. [Timeline scrubber and replay](#7-timeline-scrubber-and-replay)
8. [Scaling: workshop, grid, roster, canvas](#8-scaling-workshop-grid-roster-canvas)
9. [Token and cost meters](#9-token-and-cost-meters)
10. [State store and selectors](#10-state-store-and-selectors)
11. [Accessibility and captions](#11-accessibility-and-captions)
12. [Performance budgets](#12-performance-budgets)
13. [Testing](#13-testing)

---

## 1. Scope and non-goals

**In scope:** the orchestration data model, the tree reducer, the workshop and fallback renderers, zoom, replay scrubbing, scaling thresholds, and cost accounting.

**Out of scope:** how providers produce events (see the Claude Code adapter), the single-agent linear timeline UI (see [Timeline](./TIMELINE_SPEC.md)), and the Pixie Rive state machine internals (see [Pixie](./PIXIE_SPEC.md)). This spec references Pixie states by name only.

**The three motion rules apply here without exception.** Every worker Pixie exists because a real `subagent_spawned` event arrived. Every thread, station label, and meter is recoverable to its underlying event with one click. Every node carries a plain-language caption.

---

## 2. The agent tree data model

The swarm is a forest rooted at session-level orchestrators. In practice a single Claude Code session yields one root orchestrator and a flat or shallow tree of workers, but the model supports arbitrary depth because the `Task` tool can nest.

```ts
// packages/swarm/src/model.ts
import type { AgentEvent } from '@vsclaude/contracts';

export type AgentStatus =
  | 'spawning'   // spawn event seen, no activity yet
  | 'active'     // emitting events
  | 'waiting'    // blocked on permission_request
  | 'finished'   // subagent_finished or complete
  | 'errored';   // terminal error, no complete

export interface AgentNode {
  agentId: string;
  parentAgentId?: string;
  sessionId: string;
  provider: string;

  /** Human label for the station, derived from the spawning Task input. */
  label: string;
  /** Short plain-language caption for non-technical viewers. */
  caption: string;

  status: AgentStatus;
  /** Pixie Rive state name, e.g. 'thinking' | 'typing' | 'running'. */
  pixieState: string;
  mood: 'calm' | 'focused' | 'excited' | 'struggling';
  /** 0..1, how much is happening right now; drives Rive intensity. */
  intensity: number;

  spawnedAt: number;
  finishedAt?: number;
  /** Monotonic event ids owned by this agent, in arrival order. */
  eventIds: string[];

  depth: number;            // root = 0
  childIds: string[];

  cost: AgentCost;          // see section 9
}

export interface AgentTree {
  sessionId: string;
  rootIds: string[];        // usually length 1
  nodes: Record<string, AgentNode>;
  /** Insertion order, for stable layout and roster sorting. */
  order: string[];
  /** Index of events that did not match a known agent yet (orphans). */
  pendingChildren: Record<string, string[]>; // parentId -> childIds awaiting parent
  updatedAt: number;
}
```

### Field provenance

| Field | Source event | Notes |
| --- | --- | --- |
| `agentId` | every `AgentEvent.agentId` | the join key |
| `parentAgentId` | `subagent_spawned.payload.childAgentId` plus event `agentId` as parent | parent is the spawner |
| `label` | `subagent_spawned.tool.input` | e.g. the Task `description` or `subagent_type` |
| `caption` | `AgentEvent.caption` of the latest event | falls back to a derived string |
| `pixieState`, `mood`, `intensity` | latest activity event | mapped per [Pixie](./PIXIE_SPEC.md) |
| `cost` | `token_usage` events | accumulated, see section 9 |

A node never mutates `agentId`, `parentAgentId`, or `spawnedAt` after creation. Everything else is derived state that the reducer overwrites.

---

## 3. Building the tree from events

The tree is a pure reduction over the ordered `AgentEvent` stream. The reducer must be deterministic and idempotent per event id so that replay produces an identical tree at any timestamp.

### Spawn and finish semantics

- `subagent_spawned` carries the parent in `agentId` and the child id in `payload.childAgentId`. It creates a child node in status `spawning` and links both directions.
- `subagent_finished` carries the child in `agentId` (or `payload.childAgentId` for providers that report from the parent). It sets `finishedAt` and moves the node to `finished` unless it already `errored`.
- The root orchestrator is created lazily on the first event whose `agentId` has no `parentAgentId`, or explicitly on `session_start`.

### Out-of-order arrival

Streaming can deliver a child's first activity event before its `subagent_spawned`. The reducer parks such events in `pendingChildren` keyed by the eventual parent and reconciles when the spawn arrives. If a spawn never arrives within the session, the orphan is promoted to a root at `session_end` and flagged so the UI can show a soft warning rather than dropping data. Truthful by construction means we never silently discard an event.

```ts
// packages/swarm/src/reducer.ts
export function reduceEvent(tree: AgentTree, ev: AgentEvent): AgentTree {
  const next = structuralClone(tree); // see note on immer below
  next.updatedAt = ev.ts;

  switch (ev.type) {
    case 'session_start':
      ensureNode(next, ev.agentId, undefined, ev);
      break;

    case 'subagent_spawned': {
      const childId = String(ev.payload?.childAgentId ?? '');
      const parent = ensureNode(next, ev.agentId, undefined, ev);
      const child = ensureNode(next, childId, parent.agentId, ev);
      child.label = deriveLabel(ev);
      child.status = 'spawning';
      if (!parent.childIds.includes(childId)) parent.childIds.push(childId);
      drainPending(next, childId);
      break;
    }

    case 'subagent_finished': {
      const id = String(ev.payload?.childAgentId ?? ev.agentId);
      const node = next.nodes[id];
      if (node && node.status !== 'errored') {
        node.status = 'finished';
        node.finishedAt = ev.ts;
        node.intensity = 0;
        node.pixieState = 'success';
      }
      break;
    }

    case 'error':
      markErrored(next, ev.agentId, ev);
      break;

    case 'complete':
      finishIfTerminal(next, ev.agentId, ev);
      break;

    case 'token_usage':
      applyTokenUsage(next, ev); // section 9
      break;

    default:
      applyActivity(next, ev);   // updates pixieState, mood, intensity, caption
  }
  return next;
}
```

In production we use Immer to keep the reducer readable while preserving structural sharing; `structuralClone` above is illustrative. The reducer lives in a worker when the stream is hot (see section 12).

### Mapping events to Pixie state

`applyActivity` translates the event type to a Rive state name. This is the single source of truth for what a worker Pixie acts out.

| Event type | Pixie state | Default mood |
| --- | --- | --- |
| `thinking` | `thinking` | focused |
| `todo_update` | `planning` | focused |
| `file_read`, `search` | `reading` / `searching` | calm |
| `file_edit`, `file_create`, `file_delete` | `typing` | focused |
| `command_run` | `running` | focused |
| `command_output` (build heuristic) | `building` | calm |
| `web_fetch` | `web` | calm |
| `git_action` | `git` | calm |
| `permission_request` | `waiting` | calm |
| `error` during a run | `debugging` | struggling |
| `complete` | `success` | excited |
| unresolved `error` at end | `confused` | struggling |

`intensity` is a decaying function of recent event density for that agent (events in the last 2 seconds, clamped to 0..1), so a busy worker visibly buzzes and an idle one settles.

---

## 4. The workshop scene

The default swarm view is a top-down workshop. The orchestrator Pixie stands at a central bench. Each worker Pixie occupies a station arranged around the orchestrator. A station shows the worker, a task label plaque, a thin status ring, and a small cost chip.

```
                 ┌──────────────────────────────────────┐
                 │            THE WORKSHOP               │
                 │                                       │
                 │   [station: "write tests"]            │
                 │        Pixie(typing) ●╮               │
                 │                       │ thread        │
                 │   [station: "audit"]  │               │
                 │     Pixie(reading) ●──┤               │
                 │                       │       ┌─────┐ │
                 │                    ╭───┴───────┤ ORCH│ │
                 │   [station: "lint"]│          │ Pixie│ │
                 │     Pixie(running)●┘          └─────┘ │
                 │                                       │
                 └──────────────────────────────────────┘
```

### Layout

- The orchestrator is pinned to the visual center (or right-center on wide screens to leave reading room for labels).
- Workers lay out on a force-relaxed radial ring keyed by `depth`. Depth 1 sits on the inner ring, depth 2 on the next ring, and so on. Within a ring, angular position follows `order` so the layout is stable across re-renders and replay.
- Layout is computed by a deterministic function `layoutWorkshop(tree, viewport)` so the same tree always yields the same positions. No physics jitter that would make replay non-reproducible. We use a one-shot relaxation seeded by `order`, not a live simulation.

```ts
export interface Station {
  agentId: string;
  x: number; y: number;     // scene coordinates, drive Rive targetX/targetY
  ringRadius: number;
  angle: number;
  threadFrom?: { x: number; y: number }; // parent anchor
}

export function layoutWorkshop(
  tree: AgentTree,
  viewport: { w: number; h: number },
): Station[];
```

### Connecting threads

Each non-root node draws a thread from its parent's bench to its station. Threads are SVG or PixiJS quadratic curves whose control point bows toward the orchestrator. Thread visual encodes liveness:

| Thread style | Meaning |
| --- | --- |
| Pulsing dash flowing parent to child | child `active`, work in progress |
| Steady thin line | child `waiting` |
| Solid bright pulse child to parent | a `tool_result` or `subagent_finished` just flowed back |
| Fading to transparent | child `finished`, dissolving |
| Red dashed | child `errored` |

Threads carry a moving particle along the curve when data flows back (a result returning to the orchestrator), which is the visual realization of motion rule 1: the particle exists because a real result event arrived.

### Station label

The plaque text is `node.label`, truncated to fit, with the full label on hover and in the caption rail. Labels come from the spawn input, never invented.

---

## 5. Hand-off and dissolve choreography

Two choreographed moments give the workshop its life. Both are timeline-driven with GSAP and gated on real events.

### Hand-off (spawn)

Triggered by `subagent_spawned`.

1. The orchestrator Pixie plays its `spawning` state (a brief toss gesture toward the empty station slot).
2. A new station fades and scales in at its computed position; the worker Pixie plays its `greeting` entry blend.
3. A thread draws from orchestrator to the new station over ~400 ms with a leading particle that "carries" the task.
4. The plaque label types in character by character (bound to the label, not random).

```ts
function playHandoff(orch: PixieHandle, station: Station, label: string) {
  const tl = gsap.timeline();
  tl.add(orch.trigger('spawning'))
    .from(stationEl(station.agentId), { scale: 0.6, opacity: 0, duration: 0.25 }, '<')
    .add(() => drawThread(station, { animate: true }), '<+0.05')
    .add(() => typeLabel(station.agentId, label), '<+0.15');
  return tl;
}
```

### Dissolve (finish)

Triggered by `subagent_finished` or terminal `complete`.

1. The worker plays `success` (or `confused` on unresolved error).
2. A result particle travels the thread back to the orchestrator.
3. The station fades and scales out over ~500 ms; the worker exits with its `exit` blend.
4. The freed slot is reclaimed by the next layout pass. Remaining siblings ease to their new angles so the ring stays balanced. Easing duration is fixed and replay-safe.

Errored agents do not auto-dissolve. They linger in `confused`/`debugging` with a red ring until the session ends or the user dismisses the zoom, so failures stay visible.

### Reduced motion

When the OS or app setting requests reduced motion, hand-off and dissolve collapse to a 120 ms cross-fade with no particle travel and no label typing. The information is identical; only the theater is removed.

---

## 6. Click to zoom: single-agent activity

Clicking any station (or roster row, or grid cell) zooms into that one agent's full activity. This is the literal expression of motion rule 2: meaning is always recoverable.

### Behavior

- The workshop dollies and scales so the selected station fills a focus panel on the left while a detail rail opens on the right.
- The detail rail renders the agent's linear event list: every `tool_call`, `tool_result`, `file_edit` diff, `command_run` plus `command_output`, `search`, `web_fetch`, and raw payloads, all sourced from `node.eventIds` resolved against the event store.
- A breadcrumb shows ancestry: `Orchestrator / audit / fix-lint`. Each crumb is a zoom target.
- Children of the zoomed agent render as a mini sub-workshop inside the focus panel so nested delegation stays explorable.

```ts
interface ZoomState {
  agentId: string | null;     // null = whole-swarm view
  followLive: boolean;        // auto-scroll detail rail to newest event
  expandedEventId?: string;   // a row drilled open to raw
}
```

### Drill to raw

Each detail row has a "raw" affordance that reveals `AgentEvent.raw` (the untouched provider chunk) and the normalized `payload` side by side. This guarantees that no normalization ever hides ground truth. The contract field `raw` exists precisely for this panel.

| Event in rail | Primary display | Drill target |
| --- | --- | --- |
| `file_edit` | unified diff via Monaco diff | full before/after, file path |
| `command_run` | command line | `command_output` chunks, exit code |
| `tool_call` | tool name plus formatted input | `raw` chunk |
| `web_fetch` | URL plus title | response metadata, byte count |
| `search` | query plus hit count | matched paths |

Closing the zoom (Esc or breadcrumb root) returns to the whole-swarm view with the camera easing back. Zoom state is independent of replay state, so a user can scrub time while staying zoomed on one agent.

---

## 7. Timeline scrubber and replay

The swarm is a function of the event stream up to a timestamp, which makes replay a pure operation: pick a time `t`, fold all events with `ts <= t`, render the resulting tree.

### Scrubber UI

A horizontal track spans `session.startedAt` to `now` (live) or `session.endedAt` (ended). The playhead is draggable. Marks on the track denote notable events: spawns (upward ticks), finishes (downward ticks), errors (red ticks), and permission requests (amber ticks). Hovering a mark shows its caption.

```
 spawn  spawn      error            finish   finish
   ▲      ▲          ▲                 ▼        ▼
 ──┴──────┴──────────┴───────●─────────┴────────┴──────► t
                          playhead (drag me)
   [⏮] [◀◀] [▶ / ⏸] [▶▶] [⏭]    speed: 0.5x 1x 2x 4x    [● LIVE]
```

### Replay engine

To make scrubbing cheap, the engine keeps periodic snapshots of the reduced tree (a keyframe every N events or every M milliseconds) plus the raw event log. Seeking to `t` finds the nearest preceding snapshot and folds forward only the delta. This is O(events between snapshots), not O(all events).

```ts
export interface ReplayEngine {
  seek(t: number): AgentTree;          // pure: tree as of time t
  play(speed: number): void;           // advances a virtual clock
  pause(): void;
  goLive(): void;                      // detach from replay, follow head
  readonly isLive: boolean;
  readonly virtualTime: number;
}

interface Snapshot { atEventIndex: number; ts: number; tree: AgentTree; }
```

Rules:

- Layout during replay uses the same deterministic `layoutWorkshop`, so a replayed frame looks identical to how it looked live. No physics drift.
- Hand-off and dissolve choreography are suppressed during fast scrub (speed > 1x or active drag) and replaced by instant state application, then re-enabled at 0.5x and 1x so a deliberate replay still feels alive.
- Going live snaps `virtualTime` to head and resumes consuming the live stream.
- Snapshots are bounded in memory (ring buffer); evicted snapshots are recomputed on demand from the log.

### Edge cases

- A scrub that lands between a spawn and its first activity shows the worker in `spawning` (greeting), which is truthful for that instant.
- Orphaned events parked in `pendingChildren` at time `t` are surfaced in a small "pending" tray rather than hidden.

---

## 8. Scaling: workshop, grid, roster, canvas

The view adapts to agent count so it stays legible and fast. Thresholds are defaults and live in config.

| Active agents | Mode | Renderer | Notes |
| --- | --- | --- | --- |
| 1 to 12 | Workshop | DOM + SVG + Rive | full choreography, threads, labels |
| 13 to 40 | Dense grid | DOM + Rive, sprite-sheet fallback for far cells | uniform cells, labels on hover, threads thinned |
| 41 to 150 | Roster | Virtualized list | one row per agent: state chip, label, cost, sparkline |
| 150+ or DOM stall | Swarm canvas | PixiJS | each agent a sprite dot; click still zooms |

### Mode selection

Mode is chosen by `max(activeAgents)` over a short window plus a live performance signal. If the DOM workshop drops below the frame budget (see section 12) even under the agent threshold, the view escalates one tier. This is the documented PixiJS canvas threshold: stalling DOM, not just raw count, triggers the canvas.

```ts
export function selectSwarmMode(opts: {
  activeAgents: number;
  recentFrameMs: number;     // p95 over last 1s
  domStallMs: number;        // longest blocked frame
}): 'workshop' | 'grid' | 'roster' | 'canvas' {
  if (opts.domStallMs > 250 || opts.activeAgents > 150) return 'canvas';
  if (opts.activeAgents > 40) return 'roster';
  if (opts.activeAgents > 12) return 'grid';
  return 'workshop';
}
```

### Continuity across modes

Switching modes never loses selection or zoom. The selected `agentId` is preserved; in roster the row is scrolled into view, in canvas the sprite is highlighted. Crossing a threshold uses a 200 ms cross-fade, and motion-reduced users get an instant swap. To avoid flapping at a boundary, mode changes apply hysteresis: escalate at the threshold, de-escalate only after the count sits two below it for one second.

### Roster fallback detail

The roster is a TanStack-virtualized list. Each row: status dot (color by `AgentStatus`), `label`, depth indent, live `pixieState` word, token count, cost, and a tiny activity sparkline of recent event density. Sorting options: spawn order, most recent activity, highest cost, errored first. The roster is also the keyboard-primary view: arrow keys move selection, Enter zooms.

---

## 9. Token and cost meters

Cost accounting consumes `token_usage` events and a per-provider, per-model price table. Each agent owns a running `AgentCost`; the session aggregates them. Costs are always shown with a provenance affordance so a skeptical user can verify the math against raw usage events.

```ts
export interface AgentCost {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  /** USD, derived from the price table; null when model price unknown. */
  costUsd: number | null;
  /** True if any token_usage event lacked a known price (estimate flag). */
  estimated: boolean;
  lastUpdated: number;
}
```

### Applying a usage event

```ts
function applyTokenUsage(tree: AgentTree, ev: AgentEvent) {
  const node = tree.nodes[ev.agentId];
  if (!node) return;
  const u = ev.payload as TokenUsagePayload;
  const c = node.cost;
  c.inputTokens      += u.inputTokens ?? 0;
  c.outputTokens     += u.outputTokens ?? 0;
  c.cacheReadTokens  += u.cacheReadTokens ?? 0;
  c.cacheWriteTokens += u.cacheWriteTokens ?? 0;

  const price = priceFor(ev.provider, u.model);
  if (price) {
    c.costUsd = (c.costUsd ?? 0) + dollars(u, price);
  } else {
    c.estimated = true; // price unknown, keep tokens, flag cost
  }
  c.lastUpdated = ev.ts;
}
```

The price table is data, versioned alongside provider adapters, never hardcoded in the renderer:

```ts
interface ModelPrice {
  inputPerMTok: number;
  outputPerMTok: number;
  cacheReadPerMTok?: number;
  cacheWritePerMTok?: number;
  currency: 'USD';
}
type PriceTable = Record<string /*provider*/, Record<string /*model*/, ModelPrice>>;
```

### Aggregate meter

The session header shows a total meter: summed tokens and summed `costUsd` across all nodes, with a breakdown popover by agent and by model. Because aggregation is a pure fold over the tree, it recomputes correctly at any replay timestamp, so scrubbing back in time also rewinds the cost meter. The aggregate marks itself `estimated` if any contributing node is estimated.

```ts
export function aggregateCost(tree: AgentTree): AgentCost {
  return Object.values(tree.nodes).reduce(foldCost, emptyCost());
}
```

### Per-agent display

In the workshop, each station's cost chip shows a compact dollar figure (or token count when price is unknown, with an "est" badge). In the roster, the cost column is sortable. In zoom, the detail rail header shows the full `AgentCost` breakdown with a link to every contributing `token_usage` event. Numbers always trace back to events.

---

## 10. State store and selectors

Swarm state lives in a dedicated Zustand store, fed by the reducer. Fine-grained per-agent motion values (intensity, targetX, targetY) are exposed as Jotai atoms keyed by `agentId` so a single buzzing worker re-renders without touching its siblings.

```ts
// packages/swarm/src/store.ts
interface SwarmStore {
  tree: AgentTree;
  mode: 'workshop' | 'grid' | 'roster' | 'canvas';
  zoom: ZoomState;
  replay: { isLive: boolean; virtualTime: number; speed: number };

  ingest(ev: AgentEvent): void;     // calls reduceEvent, updates snapshots
  setMode(m: SwarmStore['mode']): void;
  zoomTo(agentId: string | null): void;
  seek(t: number): void;
  goLive(): void;
}

// Selectors (memoized; consumed by components)
export const selectStations  = (s: SwarmStore) => layoutWorkshop(s.tree, viewport());
export const selectRoster    = (s: SwarmStore) => sortRoster(s.tree, rosterSort());
export const selectAgg       = (s: SwarmStore) => aggregateCost(s.tree);
export const selectZoomEvents = (s: SwarmStore) =>
  s.zoom.agentId ? s.tree.nodes[s.zoom.agentId]?.eventIds ?? [] : [];
```

Motion atoms:

```ts
// packages/swarm/src/motionAtoms.ts
import { atomFamily } from 'jotai/utils';
export const pixieMotion = atomFamily((agentId: string) =>
  atom<{ state: string; mood: string; intensity: number; x: number; y: number }>(
    initialMotion(agentId),
  ),
);
```

The boundary is strict: the reducer writes the authoritative `tree`; a thin effect projects each node's motion fields into its `pixieMotion` atom; Rive components subscribe only to their own atom. This keeps a 100-agent swarm from re-rendering wholesale on every tick.

---

## 11. Accessibility and captions

Motion rule 3 is non-negotiable: a non-technical person must follow along in plain language.

- Every station, roster row, and canvas sprite exposes an accessible name: `${label}: ${caption}` (for example, "write tests: running the test suite").
- A live region announces top-level transitions: "Orchestrator delegated a task to write tests", "audit finished", "fix-lint hit an error". Announcements are debounced and prioritize errors and waits.
- The whole view is keyboard navigable: Tab into the swarm, arrow keys move selection along `order`, Enter zooms, Esc exits zoom, Space toggles play and pause on the scrubber.
- The scrubber is an ARIA slider with `aria-valuetext` reading the human time and nearest event caption.
- Color is never the only status signal: each `AgentStatus` also has an icon and a text word so color-blind users and screen-reader users get equal information.
- Permission requests (`waiting`) raise both a visual amber ring and an announcement, since a blocked agent needs human attention.

---

## 12. Performance budgets

| Concern | Budget |
| --- | --- |
| Event ingest to tree update | < 4 ms p95 per event |
| Workshop frame time | <= 16 ms (60 fps) up to 12 agents |
| Grid frame time | <= 16 ms up to 40 agents |
| Replay seek (with snapshots) | < 30 ms for any `t` |
| Mode escalation to canvas | when `domStallMs > 250` |
| Memory for snapshots | bounded ring buffer, default 64 snapshots |

Tactics:

- Run `reduceEvent` and snapshotting in a Web Worker; post immutable diffs to the main thread. The main thread never folds the full log on the hot path.
- Project only changed nodes into motion atoms (dirty set from the reducer), never the whole tree.
- In canvas mode, use a single PixiJS container with sprite batching; one draw call class for all agent dots.
- Throttle `intensity` recomputation to one tick per animation frame, not per event.
- Suppress choreography timelines during fast scrub to avoid GSAP timeline pile-up.

---

## 13. Testing

| Layer | Tool | What to cover |
| --- | --- | --- |
| Reducer | Vitest | spawn, finish, out-of-order arrival, orphan promotion, idempotency per event id, nested depth |
| Cost | Vitest | accumulation, unknown-price estimate flag, aggregate fold, replay rewind |
| Replay | Vitest | snapshot seek equals full-fold seek for random `t` |
| Mode selection | Vitest | thresholds, hysteresis, DOM-stall escalation |
| Layout | Vitest | determinism: same tree yields same stations |
| Components | Storybook + Playwright | every `AgentStatus`, hand-off, dissolve, zoom, scrubber, each scaling mode |
| A11y | Playwright + axe | keyboard nav, live-region announcements, slider semantics |

A golden property test anchors the whole module: **for any event log and any timestamp `t`, folding the prefix `ts <= t` produces a tree byte-identical to `replay.seek(t)`.** If that holds, live view and replay can never disagree, which is the contract the entire swarm relies on.

### Determinism invariant

Because layout, reduction, and cost are all pure functions of the event prefix, the swarm is fully reproducible. Two engineers replaying the same session see the same workshop, the same threads, the same meters. That reproducibility is what lets us promise, under all three motion rules, that what the user watches is exactly what the agents did.

---

Related specs: [Architecture](./ARCHITECTURE.md), [Pixie](./PIXIE_SPEC.md), [Timeline](./TIMELINE_SPEC.md), [Event Schema](../packages/contracts/src/agent-event.ts).
