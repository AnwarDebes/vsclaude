import { describe, expect, it } from 'vitest';
import { SNIPPET_LANGUAGES, snippetsFor } from '../lib/snippets';

describe('snippetsFor', () => {
  it('returns TypeScript and JavaScript snippets including console.log', () => {
    for (const language of ['typescript', 'javascript']) {
      const prefixes = snippetsFor(language).map((s) => s.prefix);
      expect(prefixes).toContain('clg');
      expect(prefixes).toContain('fn');
    }
  });

  it('uses snippet tabstops in the body', () => {
    const clg = snippetsFor('typescript').find((s) => s.prefix === 'clg');
    expect(clg?.body).toContain('$1');
  });

  it('returns nothing for languages without snippets', () => {
    expect(snippetsFor('python')).toEqual([]);
    expect(snippetsFor('unknown')).toEqual([]);
  });

  it('lists the snippet languages', () => {
    expect(SNIPPET_LANGUAGES).toEqual(['typescript', 'javascript']);
  });
});
