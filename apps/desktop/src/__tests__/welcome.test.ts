import { describe, expect, it } from 'vitest';
import { WELCOME_TIPS, welcomeQuickActions } from '../lib/welcome';

describe('WELCOME_TIPS', () => {
  it('lists well-formed tips', () => {
    expect(WELCOME_TIPS.length).toBeGreaterThan(0);
    for (const tip of WELCOME_TIPS) {
      expect(tip.keys.length).toBeGreaterThan(0);
      expect(tip.text.length).toBeGreaterThan(0);
    }
  });
});

describe('welcomeQuickActions', () => {
  it('always offers settings and shortcuts', () => {
    const ids = welcomeQuickActions({ canOpenFolder: false, hasWorkspace: false, liveAvailable: false }).map((a) => a.id);
    expect(ids).toEqual(['open-settings', 'open-shortcuts']);
  });

  it('adds open-folder, new-file, and run-agent when available', () => {
    const ids = welcomeQuickActions({ canOpenFolder: true, hasWorkspace: true, liveAvailable: true }).map((a) => a.id);
    expect(ids).toEqual(['open-folder', 'new-file', 'open-settings', 'open-shortcuts', 'run-agent']);
  });

  it('offers open-folder without new-file when no workspace is open yet', () => {
    const ids = welcomeQuickActions({ canOpenFolder: true, hasWorkspace: false, liveAvailable: false }).map((a) => a.id);
    expect(ids).toEqual(['open-folder', 'open-settings', 'open-shortcuts']);
  });
});
