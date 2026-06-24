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
  /** The output channel this entry belongs to. Defaults to "Log". */
  channel?: string;
}

/** The default channel name for entries logged without one. */
export const DEFAULT_CHANNEL = 'Log';

function channelOf(entry: LogEntry): string {
  return entry.channel ?? DEFAULT_CHANNEL;
}

const MAX_LINES = 500;

let entries: LogEntry[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** Append a log entry to a channel, dropping the oldest once the cap is reached. */
export function appendLog(message: string, level: LogLevel = 'info', channel: string = DEFAULT_CHANNEL): void {
  entries = [...entries, { level, message, channel }];
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

/** The distinct channel names present, in first-seen order. Pure. */
export function logChannels(source: readonly LogEntry[]): string[] {
  const seen: string[] = [];
  for (const entry of source) {
    const channel = channelOf(entry);
    if (!seen.includes(channel)) seen.push(channel);
  }
  return seen;
}

/** Entries belonging to a channel. Pure. */
export function filterLogByChannel(source: readonly LogEntry[], channel: string): LogEntry[] {
  return source.filter((entry) => channelOf(entry) === channel);
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
