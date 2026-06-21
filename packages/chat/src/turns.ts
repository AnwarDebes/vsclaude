import type { TimelineItem, Turn, TurnRole } from './types.js';

/**
 * Determines which role a timeline item is attributed to. Only an explicit
 * user message belongs to the user; thinking, tool calls, commands, file
 * changes, plans, and assistant messages all belong to the assistant.
 */
function roleOf(item: TimelineItem): TurnRole {
  if (item.kind === 'message') {
    return item.role;
  }
  return 'assistant';
}

/**
 * Groups an ordered timeline into a sequence of user / assistant turns.
 *
 * A new turn begins whenever the attributed role changes. Consecutive items of
 * the same role accumulate into the current turn. The result preserves the
 * order of the input and never reorders items across turn boundaries, so the
 * concatenation of all `turn.items` equals the input timeline.
 *
 * Each turn records the timestamp span of its items via {@link Turn.startTs}
 * and {@link Turn.endTs}.
 */
export function groupIntoTurns(timeline: readonly TimelineItem[]): Turn[] {
  const turns: Turn[] = [];
  let current: {
    role: TurnRole;
    startTs: number;
    endTs: number;
    items: TimelineItem[];
  } | null = null;

  for (const item of timeline) {
    const role = roleOf(item);
    if (current === null || current.role !== role) {
      if (current !== null) {
        turns.push(finalize(current, turns.length));
      }
      current = {
        role,
        startTs: item.ts,
        endTs: item.ts,
        items: [item],
      };
      continue;
    }
    current.items.push(item);
    current.endTs = Math.max(current.endTs, item.ts);
    current.startTs = Math.min(current.startTs, item.ts);
  }

  if (current !== null) {
    turns.push(finalize(current, turns.length));
  }

  return turns;
}

/** Freezes a working turn into an immutable {@link Turn}. */
function finalize(
  working: {
    role: TurnRole;
    startTs: number;
    endTs: number;
    items: TimelineItem[];
  },
  index: number,
): Turn {
  const anchor = working.items[0];
  const id = anchor !== undefined ? `turn-${anchor.id}` : `turn-${index}`;
  return {
    id,
    role: working.role,
    startTs: working.startTs,
    endTs: working.endTs,
    items: working.items,
  };
}
