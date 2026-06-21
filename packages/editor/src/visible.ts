import type { TreeNode } from './tree.js';

/**
 * A single row produced for virtualized rendering of the file tree. Each row
 * carries enough metadata to render an indented, expandable entry without
 * re-walking the tree.
 */
export interface VisibleRow {
  /** The node this row represents. */
  readonly node: TreeNode;
  /** Indentation depth, mirrors {@link TreeNode.depth}. */
  readonly depth: number;
  /** True when the node is an expanded directory. */
  readonly expanded: boolean;
  /** True for directories that contain at least one child. */
  readonly hasChildren: boolean;
}

/**
 * Returns a new expansion set with the given path toggled. Pure: the input set
 * is never mutated, which keeps it safe for React state updates.
 *
 * Expanding a path that is not a directory is harmless but meaningless; callers
 * typically only toggle directory paths.
 */
export function toggleExpanded(
  expanded: ReadonlySet<string>,
  path: string,
): Set<string> {
  const next = new Set(expanded);
  if (next.has(path)) {
    next.delete(path);
  } else {
    next.add(path);
  }
  return next;
}

/**
 * Flattens a sorted tree into the ordered list of rows that should currently be
 * visible, given the set of expanded directory paths. Collapsed directories
 * hide their descendants. The output order is a pre-order traversal, which is
 * exactly what a virtualized list renderer consumes.
 */
export function flattenVisible(
  roots: readonly TreeNode[],
  expanded: ReadonlySet<string>,
): VisibleRow[] {
  const rows: VisibleRow[] = [];

  const walk = (nodes: readonly TreeNode[]): void => {
    for (const node of nodes) {
      const isExpanded = node.isDirectory && expanded.has(node.path);
      rows.push({
        node,
        depth: node.depth,
        expanded: isExpanded,
        hasChildren: node.isDirectory && node.children.length > 0,
      });
      if (isExpanded && node.children.length > 0) {
        walk(node.children);
      }
    }
  };

  walk(roots);
  return rows;
}

/**
 * Collects the paths of every directory in the tree. Useful as an initial
 * "expand all" state for the file explorer.
 */
export function collectDirectoryPaths(roots: readonly TreeNode[]): Set<string> {
  const paths = new Set<string>();
  const walk = (nodes: readonly TreeNode[]): void => {
    for (const node of nodes) {
      if (node.isDirectory) {
        paths.add(node.path);
        walk(node.children);
      }
    }
  };
  walk(roots);
  return paths;
}
