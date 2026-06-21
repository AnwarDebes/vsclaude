# @vsclaude/chat

Conversation and timeline model for the vsclaude IDE. This package consumes a normalized `AgentEvent` stream from `@vsclaude/contracts` and turns it into an ordered, inspectable conversation: it collapses each tool call with its matching result, folds shell command output back into the command that produced it, lifts todo updates into plan snapshots, and segments the whole thing into user and assistant turns. It is pure, dependency-free TypeScript so it can run in the extension host, a worker, or a test harness without any UI dependencies.

## What lives here

- `buildTimeline(events)`: groups raw events into a discriminated union of `TimelineItem`s (`message`, `thinking`, `toolCall`, `fileChange`, `command`, `plan`). Tool calls are matched to results by `toolUseId`; command runs are matched to output by `runId`.
- `groupIntoTurns(timeline)`: segments an ordered timeline into `Turn`s, where a new turn starts whenever the attributed role flips between user and assistant.
- `inspectorModel(event)`: produces a normalized `{ title, fields, raw }` drill-down for the tool-call inspector. The `raw` field is always the untouched source event so the inspector can reveal exactly what a provider sent.
- `payloadOf`, `readString`, `readOptionalString`: small narrowing helpers for working with event payloads without casting.

## Usage

```ts
import {
  buildTimeline,
  groupIntoTurns,
  inspectorModel,
} from '@vsclaude/chat';
import type { AgentEvent } from '@vsclaude/contracts';

declare const events: AgentEvent[];

const timeline = buildTimeline(events);
const turns = groupIntoTurns(timeline);

for (const turn of turns) {
  console.log(turn.role, turn.items.length);
}

const first = timeline[0];
if (first !== undefined && first.kind === 'toolCall') {
  const model = inspectorModel(first.callEvent);
  console.log(model.title, model.fields, model.raw);
}
```

## Status

This is the initial logic layer: the pure model that maps events to timelines, turns, and inspector views. The React or native rendering integration (timeline list, turn cards, inspector panel) is tracked in ROADMAP.md and lands in a later milestone. The public surface here is intended to stay stable as those views are built on top of it.
