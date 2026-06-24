import { describe, expect, it } from 'vitest';
import { ACCESSIBILITY_HELP } from '../lib/a11y-help';

describe('ACCESSIBILITY_HELP', () => {
  it('lists help entries, each with a title and detail', () => {
    expect(ACCESSIBILITY_HELP.length).toBeGreaterThan(0);
    for (const entry of ACCESSIBILITY_HELP) {
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.detail.length).toBeGreaterThan(0);
    }
  });

  it('covers the command palette', () => {
    expect(ACCESSIBILITY_HELP.some((e) => /command palette/i.test(e.title))).toBe(true);
  });
});
