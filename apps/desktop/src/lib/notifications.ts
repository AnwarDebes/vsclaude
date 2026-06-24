/**
 * A small notification store backing the notification center. The app posts
 * user-facing messages (an action needs a folder, a workspace error); the center
 * shows the history newest-first and lets each be dismissed. A module store, so
 * the add, dismiss, clear, and cap behavior is unit tested.
 */
export type NotificationKind = 'info' | 'warning' | 'error';

export interface Notification {
  id: number;
  kind: NotificationKind;
  message: string;
}

const MAX = 100;

let items: Notification[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** Post a notification (newest first). Returns its id. */
export function addNotification(kind: NotificationKind, message: string): number {
  const id = nextId;
  nextId += 1;
  items = [{ id, kind, message }, ...items].slice(0, MAX);
  emit();
  return id;
}

export function dismissNotification(id: number): void {
  const next = items.filter((n) => n.id !== id);
  if (next.length !== items.length) {
    items = next;
    emit();
  }
}

export function clearNotifications(): void {
  if (items.length === 0) return;
  items = [];
  emit();
}

/** The current notifications, newest first. Stable reference until changed. */
export function getNotifications(): readonly Notification[] {
  return items;
}

export function subscribeNotifications(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
