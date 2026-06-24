import { describe, expect, it } from 'vitest';
import type { SearchResult } from '@vsclaude/contracts';
import { splitLineByRanges, summarizeSearch } from '../workspace/searchModel';

const text = (segs: { text: string; match: boolean }[]) => segs.map((s) => s.text).join('');

describe('splitLineByRanges', () => {
  it('returns one plain segment when there are no ranges', () => {
    expect(splitLineByRanges('hello world', [])).toEqual([{ text: 'hello world', match: false }]);
  });

  it('splits a match in the middle into plain, match, plain', () => {
    const segs = splitLineByRanges('a needle b', [{ start: 2, end: 8 }]);
    expect(segs).toEqual([
      { text: 'a ', match: false },
      { text: 'needle', match: true },
      { text: ' b', match: false },
    ]);
  });

  it('handles a match at the start and at the end', () => {
    expect(splitLineByRanges('foobar', [{ start: 0, end: 3 }])).toEqual([
      { text: 'foo', match: true },
      { text: 'bar', match: false },
    ]);
    expect(splitLineByRanges('foobar', [{ start: 3, end: 6 }])).toEqual([
      { text: 'foo', match: false },
      { text: 'bar', match: true },
    ]);
  });

  it('preserves the full text across the segments', () => {
    const line = 'the cat sat on the mat';
    const segs = splitLineByRanges(line, [{ start: 4, end: 7 }, { start: 19, end: 22 }]);
    expect(text(segs)).toBe(line);
    expect(segs.filter((s) => s.match).map((s) => s.text)).toEqual(['cat', 'mat']);
  });

  it('sorts out-of-order ranges and merges overlaps', () => {
    const segs = splitLineByRanges('abcdef', [{ start: 4, end: 6 }, { start: 0, end: 2 }, { start: 1, end: 3 }]);
    expect(text(segs)).toBe('abcdef');
    expect(segs.filter((s) => s.match).map((s) => s.text)).toEqual(['abc', 'ef']);
  });

  it('indexes by code point, not UTF-16 unit', () => {
    // "h", combining-free accented e, then "llo": the range over the accent.
    const segs = splitLineByRanges('héllo', [{ start: 1, end: 2 }]);
    expect(segs).toEqual([
      { text: 'h', match: false },
      { text: 'é', match: true },
      { text: 'llo', match: false },
    ]);
  });
});

describe('summarizeSearch', () => {
  it('reports the file and match counts', () => {
    const result: SearchResult = {
      files: [
        { path: 'a.ts', lines: [{ line: 1, text: 'x', ranges: [{ start: 0, end: 1 }] }] },
        { path: 'b.ts', lines: [] },
      ],
      matchCount: 7,
      truncated: false,
    };
    expect(summarizeSearch(result)).toEqual({ fileCount: 2, matchCount: 7 });
  });
});
