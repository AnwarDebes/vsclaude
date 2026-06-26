import { describe, expect, it } from 'vitest';
import { parseSearchHistory, pushSearchHistory } from '../lib/search-history';

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

describe('parseSearchHistory', () => {
  it('parses a stored string array', () => {
    expect(parseSearchHistory('["b","a"]')).toEqual(['b', 'a']);
  });

  it('returns empty for null, invalid JSON, or a non-array', () => {
    expect(parseSearchHistory(null)).toEqual([]);
    expect(parseSearchHistory('not json')).toEqual([]);
    expect(parseSearchHistory('{"a":1}')).toEqual([]);
  });

  it('drops non-string and empty entries and caps at 20', () => {
    expect(parseSearchHistory('["a", 1, "", null, "b"]')).toEqual(['a', 'b']);
    const big = JSON.stringify(Array.from({ length: 30 }, (_, i) => `q${i}`));
    expect(parseSearchHistory(big)).toHaveLength(20);
  });
});
