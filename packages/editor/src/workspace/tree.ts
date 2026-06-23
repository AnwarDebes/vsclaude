/**
 * Builds the explorer tree for one or more open workspace roots from a flat,
 * lazily accumulated map of loaded filesystem entries. Each root is a top-level
 * node; a directory's children are the loaded entries whose parent is that
 * directory, so unexpanded (not yet loaded) directories simply have no children
 * until their contents are fetched. Output is the same {@link TreeNode} shape the
 * existing virtualized renderer (`flattenVisible`, `toggleExpanded`) consumes.
 */
import type { FsEntry } from '@vsclaude/contracts';
import type { TreeNode } from '../tree.js';
import { compareNodes } from '../tree.js';
import { normalizePath, parentDir } from './paths.js';

/** A single open root folder. */
export interface WorkspaceRootInput {
  /** Absolute, forward-slash path to the root folder. */
  readonly path: string;
  /** Display name for the root (usually its final segment). */
  readonly name: string;
}

/**
 * Assembles the tree. `entries` is keyed by normalized path and grows as the
 * user expands directories. Children are grouped by parent directory in a single
 * pass, then each root is materialized recursively and sorted with directories
 * first.
 */
export function buildWorkspaceTree(
  roots: readonly WorkspaceRootInput[],
  entries: ReadonlyMap<string, FsEntry>,
): TreeNode[] {
  const byParent = new Map<string, FsEntry[]>();
  for (const entry of entries.values()) {
    const parent = parentDir(entry.path);
    const list = byParent.get(parent);
    if (list) {
      list.push(entry);
    } else {
      byParent.set(parent, [entry]);
    }
  }

  const build = (path: string, name: string, isDirectory: boolean, depth: number): TreeNode => {
    const childEntries = isDirectory ? byParent.get(normalizePath(path)) : undefined;
    const children = (childEntries ?? [])
      .map((entry) => build(entry.path, entry.name, entry.kind === 'directory', depth + 1))
      .sort(compareNodes);
    return { path: normalizePath(path), name, isDirectory, depth, children };
  };

  return roots.map((root) => build(root.path, root.name, true, 0)).sort(compareNodes);
}

/**
 * Merges freshly listed directory children into the accumulated entry map,
 * returning a new map (the input is never mutated, keeping it safe for React
 * state). Stale entries for the directory that are no longer present are pruned,
 * so a re-read after a delete or rename reconciles correctly.
 */
export function mergeDirEntries(
  entries: ReadonlyMap<string, FsEntry>,
  dirPath: string,
  children: readonly FsEntry[],
): Map<string, FsEntry> {
  const dir = normalizePath(dirPath);
  const next = new Map<string, FsEntry>();
  // Keep everything that is not a direct child of the re-read directory.
  for (const [key, value] of entries) {
    if (parentDir(value.path) !== dir) {
      next.set(key, value);
    }
  }
  for (const child of children) {
    next.set(normalizePath(child.path), { ...child, path: normalizePath(child.path) });
  }
  return next;
}

/**
 * Drops a path and every descendant from the entry map (after a delete or a
 * move). Returns a new map.
 */
export function pruneSubtree(
  entries: ReadonlyMap<string, FsEntry>,
  path: string,
): Map<string, FsEntry> {
  const root = normalizePath(path);
  const prefix = root.endsWith('/') ? root : `${root}/`;
  const next = new Map<string, FsEntry>();
  for (const [key, value] of entries) {
    const p = normalizePath(value.path);
    if (p !== root && !p.startsWith(prefix)) {
      next.set(key, value);
    }
  }
  return next;
}

/**
 * Drops a path and every descendant from a set of path strings (the explorer's
 * `loadedDirs` and `expanded` sets). Returns a new set. Without this, closing or
 * deleting a directory and later recreating one at the same path would leave the
 * stale "already loaded" marker behind, so the new directory would never fetch
 * its children.
 */
export function pruneSet(set: ReadonlySet<string>, path: string): Set<string> {
  const root = normalizePath(path);
  const prefix = root.endsWith('/') ? root : `${root}/`;
  const next = new Set<string>();
  for (const value of set) {
    const v = normalizePath(value);
    if (v !== root && !v.startsWith(prefix)) next.add(value);
  }
  return next;
}
