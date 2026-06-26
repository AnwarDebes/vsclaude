import { describe, expect, it } from 'vitest';
import { findBrokenLinks, resolveLinkTarget } from '../lib/markdown-links';

const FILES = ['README.md', 'src/App.tsx', 'docs/guide.md'];

describe('resolveLinkTarget', () => {
  it('resolves relative targets and collapses . and ..', () => {
    expect(resolveLinkTarget('', 'src/App.tsx')).toBe('src/App.tsx');
    expect(resolveLinkTarget('docs', './guide.md')).toBe('docs/guide.md');
    expect(resolveLinkTarget('docs', '../src/App.tsx')).toBe('src/App.tsx');
    expect(resolveLinkTarget('a/b', '../../README.md')).toBe('README.md');
  });
});

describe('findBrokenLinks', () => {
  it('flags a relative link whose target is not a known file', () => {
    const text = 'See [the guide](docs/missing.md) for details.';
    const broken = findBrokenLinks(text, 'README.md', FILES);
    expect(broken).toHaveLength(1);
    expect(broken[0]).toMatchObject({ target: 'docs/missing.md', line: 1 });
  });

  it('does not flag a link that resolves to a known file', () => {
    expect(findBrokenLinks('[app](src/App.tsx)', 'README.md', FILES)).toEqual([]);
    expect(findBrokenLinks('[guide](guide.md)', 'docs/index.md', FILES)).toEqual([]);
  });

  it('skips external, protocol-relative, and anchor-only targets', () => {
    const text = '[ext](https://x.com) [proto](//cdn/x) [anchor](#section) [mail](mailto:a@b.c)';
    expect(findBrokenLinks(text, 'README.md', FILES)).toEqual([]);
  });

  it('ignores an anchor or query on an otherwise valid target', () => {
    expect(findBrokenLinks('[s](docs/guide.md#section)', 'README.md', FILES)).toEqual([]);
  });

  it('validates titled inline links [a](target "title")', () => {
    const broken = findBrokenLinks('[a](missing.ts "the title")', 'README.md', FILES);
    expect(broken).toHaveLength(1);
    expect(broken[0]).toMatchObject({ target: 'missing.ts' });
    expect(findBrokenLinks('[a](src/App.tsx "ok")', 'README.md', FILES)).toEqual([]);
  });

  it('does not flag links inside code spans or fenced code blocks', () => {
    const text = ['Inline `[x](nope.ts)` is code.', '', '```', '[y](also-nope.ts)', '```', '', '[real](missing.ts)'].join(
      '\n',
    );
    const broken = findBrokenLinks(text, 'README.md', FILES);
    expect(broken).toHaveLength(1);
    expect(broken[0]).toMatchObject({ target: 'missing.ts' });
  });

  it('reports the line and column of a broken target on a later line', () => {
    const text = '# Title\n\nA [bad](nope.ts) link.';
    const broken = findBrokenLinks(text, 'README.md', FILES);
    expect(broken).toHaveLength(1);
    // "A [bad](nope.ts)" -> the target 'nope.ts' starts at column 9.
    expect(broken[0]).toMatchObject({ target: 'nope.ts', line: 3, column: 9 });
  });
});
