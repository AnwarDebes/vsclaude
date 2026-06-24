import { describe, expect, it } from 'vitest';
import { findLinks } from '../lib/links';

describe('findLinks', () => {
  it('finds an https URL with its offsets', () => {
    expect(findLinks('see https://x.com here')).toEqual([
      { start: 4, end: 17, url: 'https://x.com' },
    ]);
  });

  it('gives a bare www address an https scheme', () => {
    const links = findLinks('go www.example.com');
    expect(links).toHaveLength(1);
    expect(links[0]!.url).toBe('https://www.example.com');
  });

  it('strips trailing prose punctuation from the link', () => {
    const links = findLinks('visit https://x.com.');
    expect(links[0]!.url).toBe('https://x.com');
    expect(links[0]!.end).toBe('visit https://x.com'.length);
  });

  it('finds multiple links in a line', () => {
    const links = findLinks('a http://x.io b http://y.io');
    expect(links.map((l) => l.url)).toEqual(['http://x.io', 'http://y.io']);
  });

  it('returns nothing when there is no link', () => {
    expect(findLinks('just some plain text')).toEqual([]);
    expect(findLinks('email me at name@host without a scheme')).toEqual([]);
  });
});
