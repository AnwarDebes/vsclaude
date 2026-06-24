import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addNotification,
  clearNotifications,
  dismissNotification,
  getNotifications,
  subscribeNotifications,
} from '../lib/notifications';

describe('notifications', () => {
  afterEach(() => clearNotifications());

  it('adds notifications newest first and notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeNotifications(listener);
    addNotification('info', 'first');
    addNotification('error', 'second');
    const items = getNotifications();
    expect(items.map((n) => n.message)).toEqual(['second', 'first']);
    expect(items[0]!.kind).toBe('error');
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('gives each notification a distinct id', () => {
    const a = addNotification('info', 'a');
    const b = addNotification('info', 'b');
    expect(a).not.toBe(b);
  });

  it('dismisses one by id and clears all', () => {
    const id = addNotification('info', 'keep me then remove');
    addNotification('info', 'other');
    dismissNotification(id);
    expect(getNotifications().map((n) => n.message)).toEqual(['other']);
    clearNotifications();
    expect(getNotifications()).toEqual([]);
  });

  it('caps the history at 100', () => {
    for (let i = 0; i < 120; i += 1) addNotification('info', `n${i}`);
    expect(getNotifications()).toHaveLength(100);
    expect(getNotifications()[0]!.message).toBe('n119');
  });
});
