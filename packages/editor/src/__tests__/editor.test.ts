import { describe, expect, it } from 'vitest';
import type { FsEntry } from '@vsclaude/contracts';
import {
  buildFileTree,
  flattenVisible,
  toggleExpanded,
  collectDirectoryPaths,
  baseName,
  TabManager,
} from '../index.js';

const entries: FsEntry[] = [
  { path: 'src/zebra.ts', name: 'zebra.ts', kind: 'file' },
  { path: 'src/Alpha.ts', name: 'Alpha.ts', kind: 'file' },
  { path: 'src/components', name: 'components', kind: 'directory' },
  { path: 'src/components/Button.tsx', name: 'Button.tsx', kind: 'file' },
  { path: 'README.md', name: 'README.md', kind: 'file' },
  { path: 'lib/util.ts', name: 'util.ts', kind: 'file' },
];

describe('buildFileTree', () => {
  it('sorts directories before files and alphabetically at the root', () => {
    const tree = buildFileTree(entries);
    const rootNames = tree.map((node) => node.name);
    // Directories (lib, src) come first alphabetically, then files (README.md).
    expect(rootNames).toEqual(['lib', 'src', 'README.md']);
  });

  it('orders directories before files inside a nested directory', () => {
    const tree = buildFileTree(entries);
    const src = tree.find((node) => node.name === 'src');
    expect(src?.isDirectory).toBe(true);
    const srcChildren = src?.children.map((child) => child.name) ?? [];
    // components (dir) first, then files case-insensitively: Alpha.ts, zebra.ts.
    expect(srcChildren).toEqual(['components', 'Alpha.ts', 'zebra.ts']);
  });

  it('synthesizes intermediate directories from deep paths', () => {
    const deep = buildFileTree([
      { path: 'a/b/c/file.ts', name: 'file.ts', kind: 'file' },
    ]);
    const a = deep[0];
    expect(a?.name).toBe('a');
    expect(a?.isDirectory).toBe(true);
    const file = a?.children[0]?.children[0]?.children[0];
    expect(file?.name).toBe('file.ts');
    expect(file?.isDirectory).toBe(false);
    expect(file?.depth).toBe(3);
  });
});

describe('flattenVisible and toggleExpanded', () => {
  it('hides descendants of collapsed directories and reveals them once expanded', () => {
    const tree = buildFileTree(entries);
    let expanded = new Set<string>();

    // Nothing expanded: only the three top level nodes are visible.
    const collapsed = flattenVisible(tree, expanded);
    expect(collapsed.map((row) => row.node.name)).toEqual([
      'lib',
      'src',
      'README.md',
    ]);

    // Expand src; its children appear right after it, but components stays
    // collapsed so Button.tsx is still hidden.
    expanded = toggleExpanded(expanded, 'src');
    const afterSrc = flattenVisible(tree, expanded).map((row) => row.node.name);
    expect(afterSrc).toEqual([
      'lib',
      'src',
      'components',
      'Alpha.ts',
      'zebra.ts',
      'README.md',
    ]);

    // Expand the components directory too; Button.tsx becomes visible.
    expanded = toggleExpanded(expanded, 'src/components');
    const afterComponents = flattenVisible(tree, expanded).map(
      (row) => row.node.name,
    );
    expect(afterComponents).toContain('Button.tsx');

    // Toggling src again collapses everything beneath it.
    expanded = toggleExpanded(expanded, 'src');
    const recollapsed = flattenVisible(tree, expanded).map(
      (row) => row.node.name,
    );
    expect(recollapsed).not.toContain('Alpha.ts');
  });

  it('reports hasChildren and collects every directory path', () => {
    const tree = buildFileTree(entries);
    const expanded = collectDirectoryPaths(tree);
    expect(expanded.has('src')).toBe(true);
    expect(expanded.has('src/components')).toBe(true);
    expect(expanded.has('lib')).toBe(true);

    const rows = flattenVisible(tree, expanded);
    const srcRow = rows.find((row) => row.node.name === 'src');
    expect(srcRow?.hasChildren).toBe(true);
    const readmeRow = rows.find((row) => row.node.name === 'README.md');
    expect(readmeRow?.hasChildren).toBe(false);
  });
});

describe('TabManager', () => {
  it('opens tabs, derives labels, and keeps the newest active', () => {
    const tabs = new TabManager();
    tabs.openTab('src/a.ts');
    tabs.openTab('src/b.ts');
    expect(tabs.count).toBe(2);
    expect(tabs.getActivePath()).toBe('src/b.ts');
    expect(tabs.getActive()?.label).toBe('b.ts');
  });

  it('is idempotent: re-opening an existing path activates without duplicating', () => {
    const tabs = new TabManager();
    tabs.openTab('a.ts');
    tabs.openTab('b.ts');
    tabs.openTab('a.ts');
    expect(tabs.count).toBe(2);
    expect(tabs.getActivePath()).toBe('a.ts');
  });

  it('falls back to the neighbor that takes the closed slot when closing the active tab', () => {
    const tabs = new TabManager();
    tabs.openTab('one.ts');
    tabs.openTab('two.ts');
    tabs.openTab('three.ts');
    tabs.activate('two.ts');
    expect(tabs.getActivePath()).toBe('two.ts');

    // Closing the active middle tab promotes the tab that shifts into its slot.
    expect(tabs.closeTab('two.ts')).toBe(true);
    expect(tabs.getActivePath()).toBe('three.ts');
    expect(tabs.list().map((tab) => tab.path)).toEqual(['one.ts', 'three.ts']);
  });

  it('falls back to the new last tab when the active tab was last', () => {
    const tabs = new TabManager();
    tabs.openTab('one.ts');
    tabs.openTab('two.ts');
    expect(tabs.getActivePath()).toBe('two.ts');
    tabs.closeTab('two.ts');
    expect(tabs.getActivePath()).toBe('one.ts');
  });

  it('clears the active tab when the last remaining tab is closed', () => {
    const tabs = new TabManager();
    tabs.openTab('solo.ts');
    expect(tabs.closeTab('solo.ts')).toBe(true);
    expect(tabs.getActive()).toBeNull();
    expect(tabs.getActivePath()).toBeNull();
    expect(tabs.count).toBe(0);
  });

  it('does not change the active tab when a non-active tab is closed', () => {
    const tabs = new TabManager();
    tabs.openTab('keep.ts');
    tabs.openTab('active.ts');
    expect(tabs.getActivePath()).toBe('active.ts');
    expect(tabs.closeTab('keep.ts')).toBe(true);
    expect(tabs.getActivePath()).toBe('active.ts');
    expect(tabs.has('keep.ts')).toBe(false);
  });

  it('ignores closing or activating unknown paths', () => {
    const tabs = new TabManager();
    tabs.openTab('real.ts');
    expect(tabs.closeTab('ghost.ts')).toBe(false);
    expect(tabs.activate('ghost.ts')).toBe(false);
    expect(tabs.getActivePath()).toBe('real.ts');
  });
});

describe('baseName', () => {
  it('returns the final segment for posix and windows paths', () => {
    expect(baseName('src/components/Button.tsx')).toBe('Button.tsx');
    expect(baseName('C:\\Users\\file.ts')).toBe('file.ts');
    expect(baseName('bare.ts')).toBe('bare.ts');
  });
});
