import { describe, expect, it } from 'vitest';
import { applyOnSave } from '../lib/on-save';

describe('applyOnSave', () => {
  it('trims trailing whitespace on every line', () => {
    expect(applyOnSave('a  \nb\t\nc', { trimTrailingWhitespace: true, insertFinalNewline: false })).toBe(
      'a\nb\nc',
    );
  });

  it('inserts a final newline when missing', () => {
    expect(applyOnSave('a', { trimTrailingWhitespace: false, insertFinalNewline: true })).toBe('a\n');
    expect(applyOnSave('a\n', { trimTrailingWhitespace: false, insertFinalNewline: true })).toBe('a\n');
  });

  it('leaves empty content empty even with insert final newline', () => {
    expect(applyOnSave('', { trimTrailingWhitespace: false, insertFinalNewline: true })).toBe('');
  });

  it('applies both transforms together', () => {
    expect(applyOnSave('a   ', { trimTrailingWhitespace: true, insertFinalNewline: true })).toBe('a\n');
  });

  it('does nothing when both are off', () => {
    expect(applyOnSave('a  \n', { trimTrailingWhitespace: false, insertFinalNewline: false })).toBe('a  \n');
  });
});
