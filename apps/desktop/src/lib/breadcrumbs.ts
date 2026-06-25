/**
 * Splits a file path into breadcrumb segments. When a workspace root is given and
 * the path is under it, the root prefix is stripped so the trail stays relative
 * and short. Pure, so the splitting (including the root-relative case) is tested.
 */
export interface Crumb {
  name: string;
  /** The path up to and including this segment (relative when a root was stripped). */
  path: string;
}

export interface FolderEntry {
  name: string;
  path: string;
  kind: 'file' | 'directory';
}

/**
 * The direct children of a folder, derived from a flat list of paths: files in
 * the folder plus any immediate subfolders (including ones implied only by a
 * deeper file path). Folders come first, then files, each sorted by name. Pure,
 * so the derivation (including implicit subfolders) is unit tested.
 */
export function folderChildren(
  entries: ReadonlyArray<{ path: string; kind: 'file' | 'directory' }>,
  folderPath: string,
): FolderEntry[] {
  const prefix = folderPath ? `${folderPath}/` : '';
  const byPath = new Map<string, 'file' | 'directory'>();
  for (const entry of entries) {
    if (entry.path === folderPath || !entry.path.startsWith(prefix)) continue;
    const rest = entry.path.slice(prefix.length);
    const slash = rest.indexOf('/');
    if (slash === -1) {
      if (!byPath.has(entry.path)) byPath.set(entry.path, entry.kind);
    } else {
      // A deeper path means the first segment is a subfolder of this folder.
      byPath.set(prefix + rest.slice(0, slash), 'directory');
    }
  }
  return Array.from(byPath.entries())
    .map(([path, kind]) => ({ name: path.split('/').pop() ?? path, path, kind }))
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

/**
 * The full path of a breadcrumb folder in the same namespace as the entry list.
 * Crumb paths are root-relative (breadcrumbSegments strips the root), but the
 * workspace tree's paths are absolute, so the dropdown must re-prepend the root
 * to match. In the demo (no root) the crumb path is already in the entry namespace.
 */
export function crumbFolderPath(root: string | undefined, crumbPath: string): string {
  return root ? `${root}/${crumbPath}` : crumbPath;
}

export function breadcrumbSegments(path: string, root?: string): Crumb[] {
  let rel = path;
  if (root && (path === root || path.startsWith(`${root}/`))) {
    rel = path.slice(root.length).replace(/^\//, '');
  }
  const parts = rel.split('/').filter((p) => p.length > 0);
  const crumbs: Crumb[] = [];
  let acc = '';
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part;
    crumbs.push({ name: part, path: acc });
  }
  return crumbs;
}
