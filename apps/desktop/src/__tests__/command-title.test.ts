import { describe, expect, it } from 'vitest';
import { splitCommandTitle } from '../lib/command-title';

describe('splitCommandTitle', () => {
  it('splits a Category: Label title', () => {
    expect(splitCommandTitle('Git: View History')).toEqual({ category: 'Git', label: 'View History' });
    expect(splitCommandTitle('View: Output')).toEqual({ category: 'View', label: 'Output' });
  });

  it('leaves a title without a category prefix whole', () => {
    expect(splitCommandTitle('Review changes and commit')).toEqual({
      label: 'Review changes and commit',
    });
  });

  it('does not treat a leading colon as a category', () => {
    expect(splitCommandTitle(': odd')).toEqual({ label: ': odd' });
  });
});
