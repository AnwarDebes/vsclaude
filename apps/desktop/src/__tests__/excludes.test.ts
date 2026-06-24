import { describe, expect, it } from 'vitest';
import { isExcludedPath } from '../lib/excludes';

describe('isExcludedPath', () => {
  it('excludes paths inside noise directories', () => {
    expect(isExcludedPath('node_modules/react/index.js')).toBe(true);
    expect(isExcludedPath('packages/a/dist/out.js')).toBe(true);
    expect(isExcludedPath('repo/.git/config')).toBe(true);
  });

  it('keeps normal source paths', () => {
    expect(isExcludedPath('src/app.ts')).toBe(false);
    expect(isExcludedPath('README.md')).toBe(false);
    expect(isExcludedPath('src/components/Button.tsx')).toBe(false);
  });
});
