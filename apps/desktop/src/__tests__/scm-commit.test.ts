import { describe, expect, it } from 'vitest';
import { amendConfirmed, commitDisabled } from '../lib/scm-commit';

describe('amendConfirmed', () => {
  it('accepts "amend" case-insensitively and trimmed', () => {
    expect(amendConfirmed('amend')).toBe(true);
    expect(amendConfirmed('  AMEND  ')).toBe(true);
  });
  it('rejects anything else', () => {
    expect(amendConfirmed('')).toBe(false);
    expect(amendConfirmed('ammend')).toBe(false);
    expect(amendConfirmed('yes')).toBe(false);
  });
});

describe('commitDisabled', () => {
  const base = { busy: false, message: 'fix', amend: false, stagedCount: 1, amendConfirm: '' };

  it('enables a normal commit with a message and staged changes', () => {
    expect(commitDisabled(base)).toBe(false);
  });

  it('disables while busy or with an empty message', () => {
    expect(commitDisabled({ ...base, busy: true })).toBe(true);
    expect(commitDisabled({ ...base, message: '   ' })).toBe(true);
  });

  it('disables a non-amend commit with nothing staged', () => {
    expect(commitDisabled({ ...base, stagedCount: 0 })).toBe(true);
  });

  it('gates an amend behind the typed confirmation', () => {
    // Amend needs no staged changes, but requires the typed confirmation.
    expect(commitDisabled({ ...base, amend: true, stagedCount: 0, amendConfirm: '' })).toBe(true);
    expect(commitDisabled({ ...base, amend: true, stagedCount: 0, amendConfirm: 'nope' })).toBe(true);
    expect(commitDisabled({ ...base, amend: true, stagedCount: 0, amendConfirm: 'amend' })).toBe(false);
  });
});
