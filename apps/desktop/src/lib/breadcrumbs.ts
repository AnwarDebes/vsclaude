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
