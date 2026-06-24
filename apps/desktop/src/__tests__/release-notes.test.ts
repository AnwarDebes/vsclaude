import { describe, expect, it } from 'vitest';
import { RELEASE_NOTES } from '../lib/release-notes';

describe('RELEASE_NOTES', () => {
  it('has several sections', () => {
    expect(RELEASE_NOTES.length).toBeGreaterThanOrEqual(3);
  });

  it('gives every section a title and at least one non-empty item', () => {
    for (const section of RELEASE_NOTES) {
      expect(section.title.trim()).not.toBe('');
      expect(section.items.length).toBeGreaterThan(0);
      for (const item of section.items) {
        expect(item.trim()).not.toBe('');
      }
    }
  });

  it('covers source control', () => {
    const titles = RELEASE_NOTES.map((s) => s.title);
    expect(titles).toContain('Source control');
  });
});
