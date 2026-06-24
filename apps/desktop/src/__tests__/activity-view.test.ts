import { describe, expect, it } from 'vitest';
import { activeViewFor } from '../lib/activity-view';

describe('activeViewFor', () => {
  it('highlights search and source control when their drawer is open', () => {
    expect(activeViewFor('search')).toBe('search');
    expect(activeViewFor('scm')).toBe('scm');
  });

  it('falls back to the explorer otherwise', () => {
    expect(activeViewFor('none')).toBe('explorer');
    expect(activeViewFor('problems')).toBe('explorer');
  });
});
