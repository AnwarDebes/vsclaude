import { describe, expect, it } from 'vitest';
import { isUntitled, untitledName } from '../lib/untitled';

describe('untitled scratchpads', () => {
  it('names them Untitled-N', () => {
    expect(untitledName(1)).toBe('Untitled-1');
    expect(untitledName(7)).toBe('Untitled-7');
  });

  it('recognizes untitled paths', () => {
    expect(isUntitled('Untitled-1')).toBe(true);
    expect(isUntitled('Untitled-42')).toBe(true);
    expect(isUntitled('src/app.ts')).toBe(false);
    expect(isUntitled('README.md')).toBe(false);
  });
});
