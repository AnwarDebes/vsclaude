import { describe, expect, it } from 'vitest';
import { hexDump } from '../lib/hex';

describe('hexDump', () => {
  it('dumps a short string with offset, hex, and ascii', () => {
    const dump = hexDump('AB');
    expect(dump.startsWith('00000000  ')).toBe(true);
    expect(dump).toContain('41 42');
    expect(dump.endsWith('  AB')).toBe(true);
  });

  it('shows non-printable bytes as dots in the ascii gutter', () => {
    expect(hexDump('\n')).toContain('0a');
    expect(hexDump('\n').endsWith('  .')).toBe(true);
  });

  it('wraps to a new row every 16 bytes', () => {
    const dump = hexDump('0123456789abcdefZ');
    expect(dump.split('\n')).toHaveLength(2);
    expect(dump.split('\n')[1]!.startsWith('00000010')).toBe(true);
  });

  it('returns an empty string for empty input', () => {
    expect(hexDump('')).toBe('');
  });
});
