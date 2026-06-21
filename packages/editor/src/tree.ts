import type { FsEntry } from '@vsclaude/contracts';

/**
 * A node in the editor file tree. Wraps an {@link FsEntry} and, for
 * directories, holds an ordered list of child nodes. The tree is fully
 * normalized: directories come before files and siblings are sorted
 * alphabetically (case insensitive, then case sensitive as a tie break).
 */
export interface TreeNode {
  /** Absolute or workspace relative path, taken from the source entry. */
  readonly path: string;
  /** The display name (final path segment). */
  readonly name: string;
  /** Whether this node is a directory. */
  readonly isDirectory: boolean;
  /** Depth from the synthetic root: top level entries have depth 0. */
  readonly depth: number;
  /** Ordered children. Always empty for files. */
  readonly children: TreeNode[];
}

/**
 * Splits a path into its non empty segments, tolerating both POSIX and
 * Windows separators and collapsing repeated separators.
 */
function splitSegments(path: string): string[] {
  return path
    .split(/[\\/]+/)
    .filter((segment) => segment.length > 0);
}

/**
 * The final, human readable segment of a path. Falls back to the full path
 * when no separators are present (for example a single bare file name).
 */
export function baseName(path: string): string {
  const segments = splitSegments(path);
  const last = segments[segments.length - 1];
  return last ?? path;
}

/**
 * Comparator implementing the canonical editor ordering: directories sort
 * before files, then by name case insensitively, then case sensitively so the
 * order is stable and deterministic.
 */
export function compareNodes(a: TreeNode, b: TreeNode): number {
  if (a.isDirectory !== b.isDirectory) {
    return a.isDirectory ? -1 : 1;
  }
  const lowerA = a.name.toLowerCase();
  const lowerB = b.name.toLowerCase();
  if (lowerA < lowerB) return -1;
  if (lowerA > lowerB) return 1;
  if (a.name < b.name) return -1;
  if (a.name > b.name) return 1;
  return 0;
}

/** Mutable scaffolding node used only while building the tree. */
interface MutableNode {
  path: string;
  name: string;
  isDirectory: boolean;
  depth: number;
  readonly children: Map<string, MutableNode>;
}

function makeMutable(
  path: string,
  name: string,
  isDirectory: boolean,
  depth: number,
): MutableNode {
  return { path, name, isDirectory, depth, children: new Map() };
}

/**
 * Recursively freezes a mutable node into an immutable {@link TreeNode},
 * sorting children with {@link compareNodes}.
 */
function finalize(node: MutableNode): TreeNode {
  const children = Array.from(node.children.values())
    .map(finalize)
    .sort(compareNodes);
  return {
    path: node.path,
    name: node.name,
    isDirectory: node.isDirectory,
    depth: node.depth,
    children,
  };
}

/**
 * Builds a nested, sorted tree model from a flat list of {@link FsEntry}.
 *
 * Intermediate directories are synthesized from each entry's path even when
 * they are not present as their own entries, so a single deep file produces a
 * full chain of directory nodes. When an explicit directory entry exists, its
 * canonical path from the entry is preserved.
 *
 * The returned array is the set of top level nodes, already sorted with
 * directories first and then alphabetically.
 */
export function buildFileTree(entries: FsEntry[]): TreeNode[] {
  const roots = new Map<string, MutableNode>();

  for (const entry of entries) {
    const segments = splitSegments(entry.path);
    if (segments.length === 0) {
      continue;
    }

    let level = roots;
    let depth = 0;
    let accumulated = '';

    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i];
      if (segment === undefined) {
        continue;
      }
      const isLast = i === segments.length - 1;
      accumulated = accumulated === '' ? segment : `${accumulated}/${segment}`;

      let node = level.get(segment);
      if (node === undefined) {
        // A non final segment is always a directory. The final segment is a
        // directory only when the source entry says so.
        const isDirectory = isLast ? entry.kind === 'directory' : true;
        node = makeMutable(
          isLast ? entry.path : accumulated,
          segment,
          isDirectory,
          depth,
        );
        level.set(segment, node);
      } else if (isLast) {
        // The node already existed as a synthesized directory; reconcile it
        // with the explicit entry, preferring the entry's canonical path.
        node.path = entry.path;
        node.isDirectory = entry.kind === 'directory';
      }

      level = node.children;
      depth += 1;
    }
  }

  return Array.from(roots.values()).map(finalize).sort(compareNodes);
}
