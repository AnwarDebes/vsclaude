import { describe, expect, it } from 'vitest';
import { breadcrumbSegments, crumbFolderPath, folderChildren } from '../lib/breadcrumbs';

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

describe('folderChildren', () => {
  const entries = [
    { path: 'src/auth/login-form.tsx', kind: 'file' as const },
    { path: 'src/auth', kind: 'directory' as const },
    { path: 'src/App.tsx', kind: 'file' as const },
    { path: 'src/main.tsx', kind: 'file' as const },
    { path: 'README.md', kind: 'file' as const },
  ];

  it('lists a folder\'s direct children, folders before files', () => {
    expect(folderChildren(entries, 'src')).toEqual([
      { name: 'auth', path: 'src/auth', kind: 'directory' },
      { name: 'App.tsx', path: 'src/App.tsx', kind: 'file' },
      { name: 'main.tsx', path: 'src/main.tsx', kind: 'file' },
    ]);
  });

  it('derives an implicit subfolder from a deeper file path', () => {
    // "src" is implied only by deeper paths; it must still appear at the root.
    const root = folderChildren(entries, '');
    expect(root).toContainEqual({ name: 'src', path: 'src', kind: 'directory' });
    expect(root).toContainEqual({ name: 'README.md', path: 'README.md', kind: 'file' });
  });

  it('does not include the folder itself or unrelated paths', () => {
    expect(folderChildren(entries, 'src/auth')).toEqual([
      { name: 'login-form.tsx', path: 'src/auth/login-form.tsx', kind: 'file' },
    ]);
  });

  it('works in an absolute namespace (workspace tree paths)', () => {
    // Native ws.tree paths are absolute; the dropdown must filter them with an
    // absolute folder path (the bug was filtering absolute paths with a relative one).
    const abs = [
      { path: '/home/me/proj/src/auth/session.ts', kind: 'file' as const },
      { path: '/home/me/proj/src/App.tsx', kind: 'file' as const },
    ];
    expect(folderChildren(abs, '/home/me/proj/src')).toEqual([
      { name: 'auth', path: '/home/me/proj/src/auth', kind: 'directory' },
      { name: 'App.tsx', path: '/home/me/proj/src/App.tsx', kind: 'file' },
    ]);
    expect(folderChildren(abs, 'src')).toEqual([]);
  });
});

describe('crumbFolderPath', () => {
  it('re-prepends the workspace root so the menu matches absolute tree paths', () => {
    expect(crumbFolderPath('/home/me/proj', 'src/auth')).toBe('/home/me/proj/src/auth');
  });

  it('leaves the crumb path alone in the demo (no root)', () => {
    expect(crumbFolderPath(undefined, 'src/auth')).toBe('src/auth');
  });
});
