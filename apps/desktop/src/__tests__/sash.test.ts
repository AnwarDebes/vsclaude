import { describe, expect, it } from 'vitest';
import { clampSize, loadSidebarWidth, SIDEBAR_DEFAULT } from '../lib/sash';

describe('clampSize', () => {
  it('clamps below min, above max, and passes a mid-range value', () => {
    expect(clampSize(150, 160, 480)).toBe(160);
    expect(clampSize(500, 160, 480)).toBe(480);
    expect(clampSize(300, 160, 480)).toBe(300);
  });

  it('models a drag: start width plus a delta, clamped', () => {
    expect(clampSize(220 + 90, 160, 480)).toBe(310);
    expect(clampSize(220 - 200, 160, 480)).toBe(160);
  });
});

describe('loadSidebarWidth', () => {
  it('falls back to the default for missing, empty, NaN, or out-of-range values', () => {
    expect(loadSidebarWidth(null)).toBe(SIDEBAR_DEFAULT);
    expect(loadSidebarWidth('')).toBe(SIDEBAR_DEFAULT);
    expect(loadSidebarWidth('abc')).toBe(SIDEBAR_DEFAULT);
    expect(loadSidebarWidth('1000')).toBe(SIDEBAR_DEFAULT);
    expect(loadSidebarWidth('100')).toBe(SIDEBAR_DEFAULT);
  });

  it('returns the saved value when in range', () => {
    expect(loadSidebarWidth('300')).toBe(300);
  });
});
