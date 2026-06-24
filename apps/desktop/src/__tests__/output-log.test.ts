import { afterEach, describe, expect, it, vi } from 'vitest';
import { appendLog, clearLog, getLog, subscribeLog } from '../lib/output-log';

describe('output log', () => {
  afterEach(() => clearLog());

  it('appends lines and notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeLog(listener);
    appendLog('one');
    appendLog('two');
    expect(getLog()).toEqual(['one', 'two']);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    appendLog('three');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('caps the log at 500 lines, keeping the most recent', () => {
    for (let i = 0; i < 600; i += 1) appendLog(`line ${i}`);
    const log = getLog();
    expect(log).toHaveLength(500);
    expect(log[0]).toBe('line 100');
    expect(log[log.length - 1]).toBe('line 599');
  });

  it('clears the log', () => {
    appendLog('x');
    clearLog();
    expect(getLog()).toEqual([]);
  });
});
