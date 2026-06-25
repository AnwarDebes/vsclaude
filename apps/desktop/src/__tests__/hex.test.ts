import { describe, expect, it } from 'vitest';
import { base64ToBytes, hexDump, hexDumpBytes } from '../lib/hex';

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

  it('encodes multi-byte characters as their real UTF-8 bytes', () => {
    // "é" is one code unit (0xe9) but two UTF-8 bytes (c3 a9).
    expect(hexDump('é')).toContain('c3 a9');
  });
});

describe('hexDumpBytes', () => {
  it('dumps raw bytes exactly, including values above 127', () => {
    const dump = hexDumpBytes(new Uint8Array([0x00, 0x01, 0x02, 0xff]));
    expect(dump.startsWith('00000000  00 01 02 ff')).toBe(true);
    // 0x00-0x1f and 0x80+ are non-printable, shown as dots.
    expect(dump.endsWith('  ....')).toBe(true);
  });
});

describe('base64ToBytes', () => {
  it('decodes standard base64 into raw bytes', () => {
    expect(Array.from(base64ToBytes('AAEC/w=='))).toEqual([0, 1, 2, 255]);
  });

  it('round-trips with hexDumpBytes for a binary blob', () => {
    const bytes = base64ToBytes('AAEC/w==');
    expect(hexDumpBytes(bytes)).toContain('00 01 02 ff');
  });
});
