# @vsclaude/motion

The event to motion mapper: the brain of the soul. This package turns the
normalized `AgentEvent` stream into `MotionDirective`s that animate the Pixie
character in the vsclaude IDE. It decides what the character is doing (state),
how it feels (mood), how energetic it is (intensity), where it looks (gaze), and
what it says (caption), all as pure, deterministic TypeScript with no UI
dependencies.

## What lives here

- `Mapper`: a stateful engine. Feed it events with `push(event, nowMs)` and read
  the latest directive with `current()`. It applies the frozen `EVENT_TO_STATE`
  mapping, a priority order (a `permission_request` always wins over background
  reads), a configurable minimum dwell time so states do not flicker, and
  debouncing of rapid micro events. Time is injected, so it never calls
  `Date.now` and stays fully testable.
- `mapEvents`: replays a whole event sequence through a fresh `Mapper` with an
  injected clock and returns the directive emitted after each event.
- `captionFor(event)`: pure, template driven captions per event type, for
  example `file_read` to `Reading <basename>.` and `search` to
  `Searching for '<query>'.`.
- `intensityFor(recentEvents)`: a 0..1 energy score from event rate and edit
  volume.
- `moodFor(state, recentEvents)`: infers `struggling`, `excited`, `focused`, or
  `calm`.
- `stateForEvent`, `gazeForEvent`, `priorityOf`, `outranks`: the state selection
  helpers used by the `Mapper`.
- `REST_DIRECTIVE`: re-exported from contracts as the initial resting state.

## Usage

```ts
import { Mapper } from '@vsclaude/motion';
import { createAgentEvent } from '@vsclaude/contracts';

const mapper = new Mapper({ minDwellMs: 600 });

const edit = createAgentEvent({
  type: 'file_edit',
  payload: { path: '/src/Pixie.tsx', addedLines: 3 },
});

const directive = mapper.push(edit, performance.now());
// directive.state    -> 'typing'
// directive.caption  -> 'Editing Pixie.tsx.'
// directive.mood     -> 'focused'
// directive.sourceEventId === edit.id

// A permission request beats a background read no matter the dwell window:
const read = createAgentEvent({ type: 'file_read', payload: { path: '/a.ts' } });
mapper.push(read, performance.now());
const perm = createAgentEvent({
  type: 'permission_request',
  payload: { reason: 'run a command' },
});
const waiting = mapper.push(perm, performance.now());
// waiting.state -> 'waiting'
```

## Status

This is the initial logic layer: pure event to directive mapping with full unit
test coverage and zero UI dependencies. The React or native integration that
renders these directives (sprite playback, easing, scene wiring) is tracked in
ROADMAP.md and lands in a later milestone. The directive contract is stable, so
downstream renderers can build against it today.
