import { describe, expect, it } from 'vitest';
import { parseActiveFile } from '../lib/active-file';

describe('parseActiveFile', () => {
  const valid = ['src/a.ts', 'src/b.ts'];

  it('returns the saved path when it names a known file', () => {
    expect(parseActiveFile('src/b.ts', valid, 'src/a.ts')).toBe('src/b.ts');
  });

  it('falls back when the saved path is unknown', () => {
    expect(parseActiveFile('src/gone.ts', valid, 'src/a.ts')).toBe('src/a.ts');
  });

  it('falls back for an empty or null value', () => {
    expect(parseActiveFile('', valid, 'src/a.ts')).toBe('src/a.ts');
    expect(parseActiveFile(null, valid, 'src/a.ts')).toBe('src/a.ts');
  });
});
