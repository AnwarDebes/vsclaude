import { describe, expect, it } from 'vitest';
import { pushSearchHistory } from '../lib/search-history';

describe('pushSearchHistory', () => {
  it('prepends the newest query', () => {
    expect(pushSearchHistory(['a'], 'b')).toEqual(['b', 'a']);
  });

  it('de-duplicates, moving a repeat to the front', () => {
    expect(pushSearchHistory(['b', 'a'], 'a')).toEqual(['a', 'b']);
  });

  it('ignores empty or whitespace queries', () => {
    expect(pushSearchHistory(['a'], '   ')).toEqual(['a']);
    expect(pushSearchHistory([], '')).toEqual([]);
  });

  it('caps the history at 20', () => {
    let history: string[] = [];
    for (let i = 0; i < 25; i += 1) history = pushSearchHistory(history, `q${i}`);
    expect(history).toHaveLength(20);
    expect(history[0]).toBe('q24');
  });
});
