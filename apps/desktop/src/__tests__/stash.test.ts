import { describe, expect, it } from 'vitest';
import { parseStashList } from '../lib/stash';

describe('parseStashList', () => {
  it('parses stash entries with index and description', () => {
    const raw = 'stash@{0}: WIP on main: 1a2b3c first\nstash@{1}: On feature: tweak';
    expect(parseStashList(raw)).toEqual([
      { index: 0, ref: 'stash@{0}', description: 'WIP on main: 1a2b3c first' },
      { index: 1, ref: 'stash@{1}', description: 'On feature: tweak' },
    ]);
  });

  it('ignores blank or malformed lines', () => {
    expect(parseStashList('')).toEqual([]);
    expect(parseStashList('not a stash line')).toEqual([]);
  });
});
