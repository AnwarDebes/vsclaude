import { describe, expect, it } from 'vitest';
import { languageForPath } from '../lib/language';

describe('languageForPath', () => {
  it('maps known extensions to Monaco language ids', () => {
    expect(languageForPath('src/app.tsx')).toBe('typescript');
    expect(languageForPath('a.js')).toBe('javascript');
    expect(languageForPath('data.json')).toBe('json');
    expect(languageForPath('style.scss')).toBe('scss');
    expect(languageForPath('main.rs')).toBe('rust');
    expect(languageForPath('script.py')).toBe('python');
    expect(languageForPath('notes.md')).toBe('markdown');
  });

  it('is case insensitive on the extension', () => {
    expect(languageForPath('README.MD')).toBe('markdown');
    expect(languageForPath('Component.TSX')).toBe('typescript');
  });

  it('falls back to plaintext for unknown or missing extensions', () => {
    expect(languageForPath('LICENSE')).toBe('plaintext');
    expect(languageForPath(undefined)).toBe('plaintext');
    expect(languageForPath('archive.zip')).toBe('plaintext');
  });

  it('honors an explicit override', () => {
    expect(languageForPath('whatever.txt', 'rust')).toBe('rust');
  });
});
