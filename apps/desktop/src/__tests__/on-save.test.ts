import { describe, expect, it } from 'vitest';
import { applyOnSave, type OnSaveOptions } from '../lib/on-save';

const OFF: OnSaveOptions = {
  trimTrailingWhitespace: false,
  insertFinalNewline: false,
  trimFinalNewlines: false,
};

describe('applyOnSave', () => {
  it('trims trailing whitespace on every line', () => {
    expect(applyOnSave('a  \nb\t\nc', { ...OFF, trimTrailingWhitespace: true })).toBe('a\nb\nc');
  });

  it('inserts a final newline when missing', () => {
    expect(applyOnSave('a', { ...OFF, insertFinalNewline: true })).toBe('a\n');
    expect(applyOnSave('a\n', { ...OFF, insertFinalNewline: true })).toBe('a\n');
  });

  it('leaves empty content empty even with insert final newline', () => {
    expect(applyOnSave('', { ...OFF, insertFinalNewline: true })).toBe('');
  });

  it('collapses extra trailing blank lines to a single final newline', () => {
    expect(applyOnSave('a\n\n\n', { ...OFF, trimFinalNewlines: true })).toBe('a\n');
    expect(applyOnSave('a\n', { ...OFF, trimFinalNewlines: true })).toBe('a\n');
    expect(applyOnSave('a', { ...OFF, trimFinalNewlines: true })).toBe('a');
  });

  it('combines trim-trailing, trim-final-newlines, and insert-final-newline', () => {
    // Trailing spaces on a blank line, then extra blanks, no final newline content.
    expect(
      applyOnSave('a\n   \n\n', {
        trimTrailingWhitespace: true,
        trimFinalNewlines: true,
        insertFinalNewline: true,
      }),
    ).toBe('a\n');
  });

  it('does nothing when all are off', () => {
    expect(applyOnSave('a  \n\n', OFF)).toBe('a  \n\n');
  });
});
