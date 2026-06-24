import { describe, expect, it } from 'vitest';
import { ancestorsOf } from '../lib/reveal';

describe('ancestorsOf', () => {
  it('lists ancestor directories outermost first, excluding the file', () => {
    expect(ancestorsOf('src/auth/use-auth.ts')).toEqual(['src', 'src/auth']);
    expect(ancestorsOf('a/b/c/d.ts')).toEqual(['a', 'a/b', 'a/b/c']);
  });

  it('returns nothing for a root-level file', () => {
    expect(ancestorsOf('README.md')).toEqual([]);
  });
});
