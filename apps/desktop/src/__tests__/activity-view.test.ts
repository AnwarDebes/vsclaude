import { describe, expect, it } from 'vitest';
import { activeViewFor, formatBadge } from '../lib/activity-view';

describe('activeViewFor', () => {
  it('highlights the view whose drawer is open', () => {
    expect(activeViewFor('search')).toBe('search');
    expect(activeViewFor('scm')).toBe('scm');
    expect(activeViewFor('problems')).toBe('problems');
  });

  it('falls back to the explorer when no drawer is open', () => {
    expect(activeViewFor('none')).toBe('explorer');
  });
});

describe('formatBadge', () => {
  it('hides zero and negatives', () => {
    expect(formatBadge(0)).toBeUndefined();
    expect(formatBadge(-2)).toBeUndefined();
  });

  it('shows the count, capping above 99', () => {
    expect(formatBadge(3)).toBe('3');
    expect(formatBadge(99)).toBe('99');
    expect(formatBadge(100)).toBe('99+');
    expect(formatBadge(2500)).toBe('99+');
  });
});
