import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  appendLog,
  clearLog,
  filterLog,
  filterLogByChannel,
  getLog,
  logChannels,
  subscribeLog,
} from '../lib/output-log';

describe('output log', () => {
  afterEach(() => clearLog());

  it('appends entries with a level and notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeLog(listener);
    appendLog('one');
    appendLog('boom', 'error');
    expect(getLog()).toEqual([
      { level: 'info', message: 'one', channel: 'Log' },
      { level: 'error', message: 'boom', channel: 'Log' },
    ]);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    appendLog('three');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('caps the log at 500 entries, keeping the most recent', () => {
    for (let i = 0; i < 600; i += 1) appendLog(`line ${i}`);
    const log = getLog();
    expect(log).toHaveLength(500);
    expect(log[0]!.message).toBe('line 100');
    expect(log[log.length - 1]!.message).toBe('line 599');
  });

  it('filters by level, or returns all', () => {
    appendLog('a');
    appendLog('b', 'warn');
    appendLog('c', 'error');
    expect(filterLog(getLog(), 'all')).toHaveLength(3);
    expect(filterLog(getLog(), 'warn').map((e) => e.message)).toEqual(['b']);
    expect(filterLog(getLog(), 'error').map((e) => e.message)).toEqual(['c']);
  });

  it('lists distinct channels in first-seen order and filters by channel', () => {
    appendLog('a');
    appendLog('task started', 'info', 'Tasks');
    appendLog('b');
    expect(logChannels(getLog())).toEqual(['Log', 'Tasks']);
    expect(filterLogByChannel(getLog(), 'Tasks').map((e) => e.message)).toEqual(['task started']);
    expect(filterLogByChannel(getLog(), 'Log').map((e) => e.message)).toEqual(['a', 'b']);
  });

  it('clears the log', () => {
    appendLog('x');
    clearLog();
    expect(getLog()).toEqual([]);
  });
});
