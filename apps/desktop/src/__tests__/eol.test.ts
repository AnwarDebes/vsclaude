import { describe, expect, it } from 'vitest';
import { resolveDefaultEol } from '../lib/eol';

describe('resolveDefaultEol', () => {
  it('follows the OS for auto: CRLF on Windows, LF elsewhere', () => {
    expect(resolveDefaultEol('auto', true)).toBe('CRLF');
    expect(resolveDefaultEol('auto', false)).toBe('LF');
  });

  it('forces the explicit choice regardless of platform', () => {
    expect(resolveDefaultEol('LF', true)).toBe('LF');
    expect(resolveDefaultEol('CRLF', false)).toBe('CRLF');
  });
});
