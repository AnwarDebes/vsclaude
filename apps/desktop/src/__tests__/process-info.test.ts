import { describe, expect, it } from 'vitest';
import { formatBytes } from '../lib/process-info';

describe('formatBytes', () => {
  it('formats bytes, KB, MB, and GB', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1048576)).toBe('1.0 MB');
    expect(formatBytes(1073741824)).toBe('1.0 GB');
  });

  it('returns n/a for invalid input', () => {
    expect(formatBytes(-1)).toBe('n/a');
    expect(formatBytes(Number.NaN)).toBe('n/a');
  });
});
