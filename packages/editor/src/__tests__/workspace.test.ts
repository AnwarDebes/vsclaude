import { describe, expect, it } from 'vitest';
import type { FsEntry } from '@vsclaude/contracts';
import {
  normalizePath,
  basePathName,
  parentDir,
  joinPath,
  splitExtension,
  isWithin,
  validateMove,
  deriveDuplicatePath,
  buildWorkspaceTree,
  mergeDirEntries,
  pruneSubtree,
  pruneSet,
  addRecent,
  removeRecent,
  serializeRecents,
  parseRecents,
  flattenVisible,
} from '../index.js';

describe('path helpers', () => {
  it('normalizes backslashes and trailing slashes', () => {
    expect(normalizePath('C:\\Users\\a\\proj\\')).toBe('C:/Users/a/proj');
    expect(normalizePath('a/b/')).toBe('a/b');
    expect(normalizePath('/')).toBe('/');
  });

  it('preserves drive and POSIX roots whose trailing slash is significant', () => {
    expect(normalizePath('C:\\')).toBe('C:/');
    expect(normalizePath('C:/')).toBe('C:/');
    expect(normalizePath('C:')).toBe('C:/');
    expect(parentDir('C:/Windows')).toBe('C:/');
    expect(joinPath('C:/', 'Windows')).toBe('C:/Windows');
    expect(isWithin('C:/Windows', 'C:/')).toBe(true);
  });

  it('groups a drive-root workspace correctly', () => {
    const entries = new Map<string, FsEntry>([
      ['C:/Windows', { path: 'C:/Windows', name: 'Windows', kind: 'directory' }],
      ['C:/pagefile.sys', { path: 'C:/pagefile.sys', name: 'pagefile.sys', kind: 'file' }],
    ]);
    const tree = buildWorkspaceTree([{ path: 'C:/', name: 'C:' }], entries);
    expect(tree[0]?.children.map((c) => c.name)).toEqual(['Windows', 'pagefile.sys']);
  });

  it('derives base name and parent directory', () => {
    expect(basePathName('C:/a/b/file.ts')).toBe('file.ts');
    expect(parentDir('C:/a/b/file.ts')).toBe('C:/a/b');
    expect(parentDir('file.ts')).toBe('');
    expect(joinPath('C:/a/b', 'c.ts')).toBe('C:/a/b/c.ts');
    expect(joinPath('', 'c.ts')).toBe('c.ts');
  });

  it('splits extensions but keeps dotfiles whole', () => {
    expect(splitExtension('index.ts')).toEqual({ stem: 'index', ext: '.ts' });
    expect(splitExtension('archive.tar.gz')).toEqual({ stem: 'archive.tar', ext: '.gz' });
    expect(splitExtension('.gitignore')).toEqual({ stem: '.gitignore', ext: '' });
    expect(splitExtension('Makefile')).toEqual({ stem: 'Makefile', ext: '' });
  });

  it('detects containment for move guards', () => {
    expect(isWithin('C:/a/b/c', 'C:/a/b')).toBe(true);
    expect(isWithin('C:/a/b', 'C:/a/b')).toBe(true);
    expect(isWithin('C:/a/bc', 'C:/a/b')).toBe(false);
    expect(isWithin('C:/x', 'C:/a/b')).toBe(false);
  });

  it('rejects moving a folder into itself, a descendant, or its own parent', () => {
    expect(validateMove('C:/a/b', 'C:/a/b')).toMatch(/itself/);
    expect(validateMove('C:/a/b', 'C:/a/b/c')).toMatch(/itself/);
    expect(validateMove('C:/a/b', 'C:/a')).toMatch(/already/i);
    expect(validateMove('C:/a/b', 'C:/x')).toBeNull();
  });
});

describe('deriveDuplicatePath', () => {
  it('appends "copy" and increments to avoid collisions', () => {
    expect(deriveDuplicatePath('C:/a/file.ts', [])).toBe('C:/a/file copy.ts');
    expect(deriveDuplicatePath('C:/a/file.ts', ['file copy.ts'])).toBe('C:/a/file copy 2.ts');
    expect(deriveDuplicatePath('C:/a/file.ts', ['file copy.ts', 'file copy 2.ts'])).toBe(
      'C:/a/file copy 3.ts',
    );
  });

  it('handles extensionless names and dotfiles', () => {
    expect(deriveDuplicatePath('C:/a/Makefile', [])).toBe('C:/a/Makefile copy');
    expect(deriveDuplicatePath('C:/a/.env', [])).toBe('C:/a/.env copy');
  });
});

describe('buildWorkspaceTree', () => {
  const root = { path: 'C:/proj', name: 'proj' };
  const entries = new Map<string, FsEntry>([
    ['C:/proj/src', { path: 'C:/proj/src', name: 'src', kind: 'directory' }],
    ['C:/proj/README.md', { path: 'C:/proj/README.md', name: 'README.md', kind: 'file' }],
    ['C:/proj/src/main.ts', { path: 'C:/proj/src/main.ts', name: 'main.ts', kind: 'file' }],
    ['C:/proj/src/app', { path: 'C:/proj/src/app', name: 'app', kind: 'directory' }],
  ]);

  it('roots each workspace folder and nests loaded children, directories first', () => {
    const tree = buildWorkspaceTree([root], entries);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.name).toBe('proj');
    expect(tree[0]?.children.map((c) => c.name)).toEqual(['src', 'README.md']);
    const src = tree[0]?.children.find((c) => c.name === 'src');
    expect(src?.children.map((c) => c.name)).toEqual(['app', 'main.ts']);
  });

  it('shows an unloaded directory with no children until its entries arrive', () => {
    const tree = buildWorkspaceTree([root], new Map());
    expect(tree[0]?.children).toEqual([]);
  });

  it('produces rows the existing flattener can render', () => {
    const tree = buildWorkspaceTree([root], entries);
    const rows = flattenVisible(tree, new Set(['C:/proj', 'C:/proj/src']));
    expect(rows.map((r) => r.node.name)).toEqual(['proj', 'src', 'app', 'main.ts', 'README.md']);
  });
});

describe('mergeDirEntries and pruneSubtree', () => {
  it('replaces a directory listing while leaving siblings intact', () => {
    const initial = new Map<string, FsEntry>([
      ['C:/p/a.ts', { path: 'C:/p/a.ts', name: 'a.ts', kind: 'file' }],
      ['C:/p/sub', { path: 'C:/p/sub', name: 'sub', kind: 'directory' }],
      ['C:/p/sub/old.ts', { path: 'C:/p/sub/old.ts', name: 'old.ts', kind: 'file' }],
    ]);
    const merged = mergeDirEntries(initial, 'C:/p/sub', [
      { path: 'C:/p/sub/new.ts', name: 'new.ts', kind: 'file' },
    ]);
    expect(merged.has('C:/p/sub/old.ts')).toBe(false);
    expect(merged.has('C:/p/sub/new.ts')).toBe(true);
    expect(merged.has('C:/p/a.ts')).toBe(true);
  });

  it('removes a path and all of its descendants', () => {
    const initial = new Map<string, FsEntry>([
      ['C:/p/keep.ts', { path: 'C:/p/keep.ts', name: 'keep.ts', kind: 'file' }],
      ['C:/p/dir', { path: 'C:/p/dir', name: 'dir', kind: 'directory' }],
      ['C:/p/dir/child.ts', { path: 'C:/p/dir/child.ts', name: 'child.ts', kind: 'file' }],
    ]);
    const pruned = pruneSubtree(initial, 'C:/p/dir');
    expect(pruned.has('C:/p/dir')).toBe(false);
    expect(pruned.has('C:/p/dir/child.ts')).toBe(false);
    expect(pruned.has('C:/p/keep.ts')).toBe(true);
  });

  it('pruneSet drops a path and its descendants but keeps unrelated siblings', () => {
    const set = new Set(['C:/p', 'C:/p/dir', 'C:/p/dir/sub', 'C:/p/other']);
    const pruned = pruneSet(set, 'C:/p/dir');
    expect([...pruned].sort()).toEqual(['C:/p', 'C:/p/other']);
    // A directory that shares a prefix but is not a descendant is kept.
    expect(pruneSet(new Set(['C:/p/dirX']), 'C:/p/dir').has('C:/p/dirX')).toBe(true);
  });
});

describe('recents model', () => {
  it('adds to the front, de-duplicates by path, and caps', () => {
    let list = addRecent([], { path: 'C:/a', name: 'a' }, 1);
    list = addRecent(list, { path: 'C:/b', name: 'b' }, 2);
    list = addRecent(list, { path: 'C:/a', name: 'a' }, 3);
    expect(list.map((r) => r.path)).toEqual(['C:/a', 'C:/b']);
    expect(list[0]?.lastOpenedMs).toBe(3);

    let capped: ReturnType<typeof addRecent> = [];
    for (let i = 0; i < 20; i += 1) {
      capped = addRecent(capped, { path: `C:/p${i}`, name: `p${i}` }, i, 12);
    }
    expect(capped).toHaveLength(12);
    expect(capped[0]?.path).toBe('C:/p19');
  });

  it('removes by path and survives a corrupt store', () => {
    const list = addRecent([], { path: 'C:/a', name: 'a' }, 1);
    expect(removeRecent(list, 'C:/a')).toEqual([]);
    expect(parseRecents('not json')).toEqual([]);
    expect(parseRecents(null)).toEqual([]);
    const round = parseRecents(serializeRecents(list));
    expect(round).toEqual(list);
  });
});
