import type {
  AgentEvent,
  MotionDirective,
  PixieState,
} from '@vsclaude/contracts';
import { REST_DIRECTIVE } from '@vsclaude/contracts';
import { captionFor } from './captions.js';
import { classifyAction } from './classify.js';
import { intensityFor, moodFor } from './intensity.js';
import {
  gazeForEvent,
  outranks,
  priorityOf,
  stateForEvent,
} from './priority.js';

/**
 * The Mapper is the brain of the soul: it consumes a stream of AgentEvents and
 * emits a single current MotionDirective that drives the Pixie character. It is
 * stateful (it tracks dwell time, a recent event window, and the active state)
 * but fully deterministic: every push takes an explicit timestamp so there is
 * no hidden clock and tests stay reproducible.
 */

/** Tunable timing and windowing knobs for the Mapper. */
export interface MapperOptions {
  /**
   * Minimum time, in milliseconds, that a state must remain active before a
   * lower or equal priority state may replace it. Prevents visual flicker when
   * many small events arrive in a burst.
   */
  readonly minDwellMs: number;
  /**
   * Events younger than this many milliseconds count toward the recent window
   * used for intensity and mood. Older events are evicted.
   */
  readonly windowMs: number;
  /**
   * Micro events of the same low priority state arriving closer together than
   * this many milliseconds are debounced: they refresh the caption but do not
   * reset dwell, so a flurry of reads does not jitter the character.
   */
  readonly debounceMs: number;
}

/** Sensible defaults tuned for a calm but responsive character. */
export const DEFAULT_MAPPER_OPTIONS: MapperOptions = {
  minDwellMs: 600,
  windowMs: 4000,
  debounceMs: 120,
};

/** Internal record pairing an event with the timestamp it was pushed at. */
interface Timed {
  readonly event: AgentEvent;
  readonly at: number;
}

/**
 * Build a MotionDirective by starting from the frozen REST_DIRECTIVE and
 * overriding the dynamic fields. Spreading REST_DIRECTIVE keeps us forward
 * compatible with whatever extra fields the directive carries.
 */
function buildDirective(input: {
  state: PixieState;
  intensity: number;
  caption: MotionDirective['caption'];
  sourceEventId: MotionDirective['sourceEventId'];
  gaze: MotionDirective['gaze'];
  mood: MotionDirective['mood'];
  actionId: MotionDirective['actionId'];
}): MotionDirective {
  return {
    ...REST_DIRECTIVE,
    state: input.state,
    mood: input.mood,
    intensity: input.intensity,
    gaze: input.gaze,
    caption: input.caption,
    sourceEventId: input.sourceEventId,
    actionId: input.actionId,
  };
}

/**
 * Stateful event to motion mapper. Feed it events with push(event, nowMs) and
 * read the latest directive with current().
 */
export class Mapper {
  private readonly options: MapperOptions;
  private recent: Timed[] = [];
  private directive: MotionDirective;
  private activeState: PixieState;
  /** Timestamp at which the active state was last (re)entered. */
  private stateEnteredAt = 0;
  /** Timestamp of the most recent push, for debounce decisions. */
  private lastPushAt = Number.NEGATIVE_INFINITY;

  constructor(options: Partial<MapperOptions> = {}) {
    this.options = { ...DEFAULT_MAPPER_OPTIONS, ...options };
    this.directive = REST_DIRECTIVE;
    this.activeState = REST_DIRECTIVE.state;
  }

  /** The current directive. Starts as REST_DIRECTIVE until the first push. */
  current(): MotionDirective {
    return this.directive;
  }

  /** The window of recent events still inside windowMs. Mostly for tests. */
  recentEvents(): readonly AgentEvent[] {
    return this.recent.map((t) => t.event);
  }

  /**
   * Push one event into the mapper at an explicit time. Returns the resulting
   * current directive. Pure with respect to nowMs: the same sequence of
   * (event, nowMs) pairs always yields the same directives.
   */
  push(event: AgentEvent, nowMs: number): MotionDirective {
    this.evictOlderThan(nowMs);
    this.recent.push({ event, at: nowMs });

    const candidate = stateForEvent(event);
    const sinceEntered = nowMs - this.stateEnteredAt;
    const sinceLastPush = nowMs - this.lastPushAt;
    this.lastPushAt = nowMs;

    const dwellSatisfied = sinceEntered >= this.options.minDwellMs;
    const isHigherPriority = outranks(candidate, this.activeState);
    const isSameState = candidate === this.activeState;

    // Debounce: a rapid low priority micro event of the same state refreshes
    // the caption but does not reset the dwell clock or churn the state.
    const isDebouncedMicro =
      isSameState &&
      sinceLastPush < this.options.debounceMs &&
      priorityOf(candidate) <= priorityOf(this.activeState);

    let transitioned = false;
    if (isHigherPriority) {
      // Priority always wins immediately: a permission_request (waiting) beats
      // an in progress read even mid dwell.
      this.enterState(candidate, nowMs);
      transitioned = true;
    } else if (isSameState) {
      if (!isDebouncedMicro) {
        // Same state, not debounced: refresh dwell so sustained activity holds.
        this.stateEnteredAt = nowMs;
      }
    } else if (dwellSatisfied) {
      // Different, not higher priority, but the minimum dwell has elapsed, so a
      // natural transition to ambient work is allowed.
      this.enterState(candidate, nowMs);
      transitioned = true;
    }
    // else: lower or equal priority arriving during the dwell window is held
    // back to prevent flicker. The driving event still updates the caption.

    const recentEvents = this.recentEvents();
    const intensity = intensityFor(recentEvents);
    const mood = moodFor(this.activeState, recentEvents);
    const caption = captionFor(event);
    const gaze = transitioned
      ? gazeForEvent(event)
      : this.directive.gaze;

    this.directive = buildDirective({
      state: this.activeState,
      intensity,
      caption,
      sourceEventId: event.id,
      gaze,
      mood,
      actionId: classifyAction(event),
    });
    return this.directive;
  }

  /** Reset to the initial resting directive. */
  reset(): void {
    this.recent = [];
    this.directive = REST_DIRECTIVE;
    this.activeState = REST_DIRECTIVE.state;
    this.stateEnteredAt = 0;
    this.lastPushAt = Number.NEGATIVE_INFINITY;
  }

  private enterState(state: PixieState, nowMs: number): void {
    this.activeState = state;
    this.stateEnteredAt = nowMs;
  }

  private evictOlderThan(nowMs: number): void {
    const cutoff = nowMs - this.options.windowMs;
    if (this.recent.length === 0) {
      return;
    }
    // Events arrive in non decreasing time order in practice; find the first
    // index still inside the window and slice once.
    let firstKept = 0;
    while (
      firstKept < this.recent.length &&
      (this.recent[firstKept]?.at ?? nowMs) < cutoff
    ) {
      firstKept += 1;
    }
    if (firstKept > 0) {
      this.recent = this.recent.slice(firstKept);
    }
  }
}

/**
 * Replay a whole sequence of events through a fresh Mapper and collect the
 * directive emitted after each one. Timestamps come from an injected clock
 * function so the result is deterministic.
 *
 * @param events the events to replay, in order
 * @param clock maps an event and its index to a millisecond timestamp
 * @param options optional Mapper tuning
 */
export function mapEvents(
  events: readonly AgentEvent[],
  clock: (event: AgentEvent, index: number) => number,
  options: Partial<MapperOptions> = {},
): MotionDirective[] {
  const mapper = new Mapper(options);
  const out: MotionDirective[] = [];
  events.forEach((event, index) => {
    out.push(mapper.push(event, clock(event, index)));
  });
  return out;
}
