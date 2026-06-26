import { describe, expect, it } from 'vitest';
import { parseBottomPanel } from '../lib/layout-state';

describe('parseBottomPanel', () => {
  it('returns a known panel value unchanged', () => {
    expect(parseBottomPanel('problems')).toBe('problems');
    expect(parseBottomPanel('output')).toBe('output');
    expect(parseBottomPanel('none')).toBe('none');
  });

  it('falls back to none for an unknown or absent value', () => {
    expect(parseBottomPanel('terminal')).toBe('none');
    expect(parseBottomPanel('')).toBe('none');
    expect(parseBottomPanel(null)).toBe('none');
  });
});
