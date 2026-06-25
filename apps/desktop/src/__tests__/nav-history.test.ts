import { beforeEach, describe, expect, it } from 'vitest';
import { navBack, navForward, recordNav, resetNav } from '../lib/nav-history';

const pos = (line: number) => ({ line, column: 1 });

describe('nav-history', () => {
  beforeEach(() => resetNav());

  it('returns null when there is nothing to go back or forward to', () => {
    expect(navBack(pos(10))).toBeNull();
    expect(navForward(pos(10))).toBeNull();
  });

  it('steps back through recorded positions in reverse order', () => {
    recordNav(pos(1));
    recordNav(pos(30));
    // The caret is now at 50; going back returns 30, then 1, then null.
    expect(navBack(pos(50))).toEqual(pos(30));
    expect(navBack(pos(30))).toEqual(pos(1));
    expect(navBack(pos(1))).toBeNull();
  });

  it('goes forward to positions left by going back', () => {
    recordNav(pos(1));
    recordNav(pos(30));
    expect(navBack(pos(50))).toEqual(pos(30)); // back to 30, forward holds 50
    expect(navForward(pos(30))).toEqual(pos(50)); // forward to 50
    expect(navForward(pos(50))).toBeNull();
  });

  it('clears the forward stack when a new jump is recorded', () => {
    recordNav(pos(1));
    navBack(pos(20)); // forward now holds 20
    recordNav(pos(5)); // a new branch clears forward
    expect(navForward(pos(5))).toBeNull();
  });

  it('bounds the history so it cannot grow without limit', () => {
    for (let i = 1; i <= 60; i += 1) recordNav(pos(i));
    let steps = 0;
    let current = pos(999);
    while (navBack(current)) {
      steps += 1;
      current = pos(900 + steps);
    }
    expect(steps).toBeLessThanOrEqual(50);
    expect(steps).toBeGreaterThan(0);
  });
});
