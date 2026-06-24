import { describe, expect, it } from 'vitest';
import { markdownSymbols } from '../lib/symbols';

describe('markdownSymbols', () => {
  it('extracts headings with their level and line', () => {
    expect(markdownSymbols('# A\n## B\n### C')).toEqual([
      { name: 'A', level: 1, line: 1 },
      { name: 'B', level: 2, line: 2 },
      { name: 'C', level: 3, line: 3 },
    ]);
  });

  it('ignores headings inside a fenced code block', () => {
    const md = '# real\n\n```\n# not a heading\n```\n## also real';
    expect(markdownSymbols(md)).toEqual([
      { name: 'real', level: 1, line: 1 },
      { name: 'also real', level: 2, line: 6 },
    ]);
  });

  it('trims trailing whitespace from the heading text', () => {
    expect(markdownSymbols('#   Title   ')).toEqual([{ name: 'Title', level: 1, line: 1 }]);
  });

  it('returns nothing when there are no headings', () => {
    expect(markdownSymbols('just a paragraph\nand another')).toEqual([]);
  });
});
