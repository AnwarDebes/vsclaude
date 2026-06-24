import { describe, expect, it } from 'vitest';
import { exitIsFailure, exitMessage } from '../lib/terminal-exit';

describe('exitMessage', () => {
  it('reports a clean exit', () => {
    expect(exitMessage(0)).toBe('[Process completed]');
  });

  it('reports a nonzero exit code', () => {
    expect(exitMessage(1)).toBe('[Process exited with code 1]');
    expect(exitMessage(137)).toBe('[Process exited with code 137]');
  });

  it('reports an unknown exit', () => {
    expect(exitMessage(null)).toBe('[Process exited]');
  });
});

describe('exitIsFailure', () => {
  it('is true only for a nonzero code', () => {
    expect(exitIsFailure(0)).toBe(false);
    expect(exitIsFailure(null)).toBe(false);
    expect(exitIsFailure(2)).toBe(true);
  });
});
