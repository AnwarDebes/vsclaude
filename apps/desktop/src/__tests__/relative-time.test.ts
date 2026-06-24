import { describe, expect, it } from 'vitest';
import { relativeTime } from '../lib/relative-time';

const NOW = 1_700_000_000;

describe('relativeTime', () => {
  it('says just now for very recent times', () => {
    expect(relativeTime(NOW - 5, NOW)).toBe('just now');
    expect(relativeTime(NOW, NOW)).toBe('just now');
  });

  it('formats minutes, hours, and days', () => {
    expect(relativeTime(NOW - 120, NOW)).toBe('2 minutes ago');
    expect(relativeTime(NOW - 3 * 3600, NOW)).toBe('3 hours ago');
    expect(relativeTime(NOW - 2 * 86400, NOW)).toBe('2 days ago');
  });

  it('uses a singular unit for one', () => {
    expect(relativeTime(NOW - 3600, NOW)).toBe('1 hour ago');
    expect(relativeTime(NOW - 86400, NOW)).toBe('1 day ago');
  });

  it('formats months and years', () => {
    expect(relativeTime(NOW - 2 * 2592000, NOW)).toBe('2 months ago');
    expect(relativeTime(NOW - 2 * 31536000, NOW)).toBe('2 years ago');
  });

  it('never shows a negative future time', () => {
    expect(relativeTime(NOW + 1000, NOW)).toBe('just now');
  });
});
