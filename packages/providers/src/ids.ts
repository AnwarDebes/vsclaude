/**
 * Pure, deterministic id helpers.
 *
 * These helpers never read clocks or random sources. The caller threads a
 * monotonically increasing counter through them so that parsing a stream is
 * fully reproducible: the same input always produces the same event ids. This
 * matters for snapshot tests, replay, and time travel debugging.
 */

/**
 * A tiny stateful counter that yields strictly increasing integers.
 *
 * It is intentionally not a generator so that callers can read the current
 * value without advancing it.
 */
export interface Counter {
  /** Returns the next integer and advances internal state. */
  next(): number;
  /** Returns the value the next call to {@link next} will produce. */
  peek(): number;
}

/**
 * Creates a {@link Counter} starting at the given value (default 0).
 *
 * @param start - The first value {@link Counter.next} should return.
 */
export function createCounter(start = 0): Counter {
  let value = start;
  return {
    next(): number {
      const current = value;
      value += 1;
      return current;
    },
    peek(): number {
      return value;
    },
  };
}

/**
 * Builds a stable, human readable event id from a session and a counter tick.
 *
 * The format is `evt-<sessionId>-<seq>` where seq is zero padded to six digits
 * so that lexical ordering matches numeric ordering for the common case.
 *
 * @param sessionId - The owning session id.
 * @param seq - A monotonically increasing sequence number.
 */
export function makeEventId(sessionId: string, seq: number): string {
  const padded = String(Math.max(0, Math.trunc(seq))).padStart(6, '0');
  return `evt-${sessionId}-${padded}`;
}
