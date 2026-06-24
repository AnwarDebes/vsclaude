import { describe, expect, it } from 'vitest';
import { breadcrumbSegments } from '../lib/breadcrumbs';

describe('breadcrumbSegments', () => {
  it('splits a relative path into cumulative segments', () => {
    expect(breadcrumbSegments('src/auth/session.ts')).toEqual([
      { name: 'src', path: 'src' },
      { name: 'auth', path: 'src/auth' },
      { name: 'session.ts', path: 'src/auth/session.ts' },
    ]);
  });

  it('strips the workspace root so the trail stays relative', () => {
    const crumbs = breadcrumbSegments('/home/me/project/src/app.ts', '/home/me/project');
    expect(crumbs.map((c) => c.name)).toEqual(['src', 'app.ts']);
  });

  it('handles a single file with no folders', () => {
    expect(breadcrumbSegments('README.md')).toEqual([{ name: 'README.md', path: 'README.md' }]);
  });

  it('returns nothing for an empty path', () => {
    expect(breadcrumbSegments('')).toEqual([]);
  });
});
