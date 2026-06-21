import type { AgentEvent, PixieMood, PixieState } from '@vsclaude/contracts';

/**
 * Intensity and mood inference. These are pure functions over a window of
 * recent events. They feed the visual energy of the Pixie: how fast it moves,
 * how worried or thrilled it looks.
 */

/** Clamp a number into the inclusive 0..1 range. */
export function clamp01(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

/**
 * Sum the size of edits in a window. Uses added plus removed line counts when
 * present on file_edit payloads, otherwise treats each edit as one unit.
 */
function editVolume(events: readonly AgentEvent[]): number {
  let volume = 0;
  for (const event of events) {
    if (event.type === 'file_edit') {
      const payload = (event.payload ?? {}) as { additions?: unknown; deletions?: unknown };
      const added = typeof payload.additions === 'number' ? payload.additions : 0;
      const removed = typeof payload.deletions === 'number' ? payload.deletions : 0;
      const churn = added + removed;
      volume += churn > 0 ? churn : 1;
    } else if (event.type === 'file_create') {
      volume += 2;
    }
  }
  return volume;
}

/**
 * Compute a 0..1 intensity score from a window of recent events.
 *
 * Two signals combine: the raw count of events (activity rate) and the edit
 * volume (how much code is changing). A small window of quiet reads scores low,
 * a burst of large edits scores high.
 *
 * @param recentEvents the events that occurred inside the rate window
 */
export function intensityFor(recentEvents: readonly AgentEvent[]): number {
  if (recentEvents.length === 0) {
    return 0;
  }
  // Rate component: saturates around 12 events in the window.
  const rate = clamp01(recentEvents.length / 12);
  // Edit component: saturates around 80 lines of churn.
  const churn = clamp01(editVolume(recentEvents) / 80);
  // Weighted blend favouring edit churn, which is the most visceral signal.
  const blended = rate * 0.55 + churn * 0.45;
  return clamp01(blended);
}

/** Count events of a given type inside a window. */
function countOfType(events: readonly AgentEvent[], type: AgentEvent['type']): number {
  let n = 0;
  for (const event of events) {
    if (event.type === type) {
      n += 1;
    }
  }
  return n;
}

/**
 * Detect a run of consecutive error events at the tail of the window. Repeated
 * errors are what make the Pixie look like it is struggling.
 */
function trailingErrorStreak(events: readonly AgentEvent[]): number {
  let streak = 0;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i];
    if (event === undefined) {
      break;
    }
    const isErrorLike =
      event.type === 'error' ||
      (event.type === 'tool_result' &&
        (event.payload as { isError?: boolean }).isError === true);
    if (isErrorLike) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Infer the Pixie mood from the current mapped state and the recent event
 * window.
 *
 * Rules, in priority order:
 * - struggling: two or more errors in a row at the tail of the window.
 * - excited: a fresh success signal (complete, or a clean result after work).
 * - focused: actively typing or running a command.
 * - calm: idle or nothing notable.
 */
export function moodFor(
  state: PixieState,
  recentEvents: readonly AgentEvent[],
): PixieMood {
  const streak = trailingErrorStreak(recentEvents);
  if (streak >= 2) {
    return 'struggling';
  }

  const last = recentEvents[recentEvents.length - 1];
  if (last?.type === 'complete') {
    return 'excited';
  }
  if (
    last?.type === 'tool_result' &&
    (last.payload as { isError?: boolean }).isError !== true &&
    countOfType(recentEvents, 'error') === 0 &&
    recentEvents.length >= 3
  ) {
    return 'excited';
  }

  if (state === 'typing' || state === 'running') {
    return 'focused';
  }
  if (state === 'thinking' || state === 'reading' || state === 'searching') {
    return 'focused';
  }
  if (state === 'waiting' || state === 'confused') {
    // Waiting on a permission or sitting on a single error is tense but not a
    // full struggle: keep it focused so the character stays engaged.
    return 'focused';
  }

  return 'calm';
}
