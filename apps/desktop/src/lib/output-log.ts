/**
 * A small in-memory output log channel. The Output panel renders it; the app
 * appends notable events (startup, opening a folder, running a task, errors). It
 * is capped so it cannot grow without bound. A module store, so the append, cap,
 * and clear behavior is unit tested.
 */
const MAX_LINES = 500;

let lines: string[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** Append a line, dropping the oldest once the cap is reached. */
export function appendLog(message: string): void {
  lines = [...lines, message];
  if (lines.length > MAX_LINES) {
    lines = lines.slice(lines.length - MAX_LINES);
  }
  emit();
}

/** The current log lines. The reference is stable until the log changes. */
export function getLog(): readonly string[] {
  return lines;
}

/** Clear the log. */
export function clearLog(): void {
  if (lines.length === 0) return;
  lines = [];
  emit();
}

/** Subscribe to log changes. Returns an unsubscribe function. */
export function subscribeLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
