/**
 * A small in-memory output log channel with levels. The Output panel renders it
 * and can filter by level; the app appends notable events (startup, opening a
 * folder, running a task, errors). It is capped so it cannot grow without bound.
 * A module store, so the append, cap, clear, and filter behavior is unit tested.
 */
export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
}

const MAX_LINES = 500;

let entries: LogEntry[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** Append a log entry, dropping the oldest once the cap is reached. */
export function appendLog(message: string, level: LogLevel = 'info'): void {
  entries = [...entries, { level, message }];
  if (entries.length > MAX_LINES) {
    entries = entries.slice(entries.length - MAX_LINES);
  }
  emit();
}

/** The current log entries. The reference is stable until the log changes. */
export function getLog(): readonly LogEntry[] {
  return entries;
}

/** Entries at a given level, or all of them. Pure. */
export function filterLog(source: readonly LogEntry[], level: LogLevel | 'all'): LogEntry[] {
  return level === 'all' ? [...source] : source.filter((entry) => entry.level === level);
}

/** Clear the log. */
export function clearLog(): void {
  if (entries.length === 0) return;
  entries = [];
  emit();
}

/** Subscribe to log changes. Returns an unsubscribe function. */
export function subscribeLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
