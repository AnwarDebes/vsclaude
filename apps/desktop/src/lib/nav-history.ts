/**
 * The editor navigation history: a back/forward stack of caret positions, like VS
 * Code's Go Back / Go Forward. The editor bridge records the position a jump leaves
 * from (go-to-line, symbol jumps, go-to-definition); navBack/navForward move through
 * the history. A module singleton, so the whole app shares one history. Pure logic,
 * so it is unit tested (resetNav isolates tests).
 */
export interface NavPos {
  line: number;
  column: number;
}

const MAX_ENTRIES = 50;
let back: NavPos[] = [];
let forward: NavPos[] = [];

/** Record the position a jump is leaving from. Clears the forward stack (new branch). */
export function recordNav(from: NavPos): void {
  back.push(from);
  if (back.length > MAX_ENTRIES) back.shift();
  forward = [];
}

/** Step back: push the current position onto forward, return the previous one. */
export function navBack(current: NavPos): NavPos | null {
  const previous = back.pop();
  if (!previous) return null;
  forward.push(current);
  return previous;
}

/** Step forward: push the current position onto back, return the next one. */
export function navForward(current: NavPos): NavPos | null {
  const next = forward.pop();
  if (!next) return null;
  back.push(current);
  return next;
}

/** Test helper: clear the shared history. */
export function resetNav(): void {
  back = [];
  forward = [];
}
