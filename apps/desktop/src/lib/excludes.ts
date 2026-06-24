/**
 * Default files.exclude behavior: hide common noise directories from the explorer
 * and quick-open. Matches by path segment (a directory of that name anywhere in the
 * path), which covers the usual cases without a full glob engine. Pure, so it is
 * unit tested.
 */
export const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next'];

export function isExcludedPath(path: string): boolean {
  return path.split('/').some((segment) => EXCLUDE_DIRS.includes(segment));
}
