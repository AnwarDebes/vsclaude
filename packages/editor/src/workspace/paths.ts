/**
 * Pure path helpers for the workspace layer. All paths are treated as forward
 * slash separated (the Rust core normalizes every path it returns), but these
 * helpers tolerate backslashes too so they are safe on raw Windows input.
 */

/**
 * Replaces backslashes with forward slashes and strips a trailing separator,
 * except where the trailing slash is significant: a Windows drive root (`C:/`)
 * and the POSIX root (`/`) keep it. A bare drive letter (`C:`) is drive relative
 * on Windows, so it is normalized to the drive root (`C:/`).
 */
export function normalizePath(path: string): string {
  const forward = path.replace(/\\/g, '/');
  if (/^[A-Za-z]:\/?$/.test(forward)) return `${forward.slice(0, 2)}/`;
  if (forward === '/') return '/';
  return forward.replace(/\/+$/, '');
}

/** The final segment of a path (its display name). */
export function baseName(path: string): string {
  const normalized = normalizePath(path);
  const idx = normalized.lastIndexOf('/');
  return idx >= 0 ? normalized.slice(idx + 1) : normalized;
}

/** The parent directory of a path, or '' when there is no parent. */
export function parentDir(path: string): string {
  const normalized = normalizePath(path);
  const idx = normalized.lastIndexOf('/');
  if (idx <= 0) return '';
  const parent = normalized.slice(0, idx);
  // A bare drive letter is the drive root, which keeps its slash, so the parent
  // of `C:/Windows` is `C:/` and groups under a drive-root workspace.
  return /^[A-Za-z]:$/.test(parent) ? `${parent}/` : parent;
}

/** Joins a directory and a child segment with a single forward slash. */
export function joinPath(dir: string, name: string): string {
  const base = normalizePath(dir);
  if (base === '') return name;
  return base.endsWith('/') ? `${base}${name}` : `${base}/${name}`;
}

/** Splits a file name into its stem and extension (the extension keeps its dot). */
export function splitExtension(name: string): { stem: string; ext: string } {
  const dot = name.lastIndexOf('.');
  // A leading dot (dotfile) is part of the stem, not an extension.
  if (dot <= 0) return { stem: name, ext: '' };
  return { stem: name.slice(0, dot), ext: name.slice(dot) };
}

/**
 * True when `child` is the same path as `ancestor` or nested beneath it. Used to
 * forbid moving a directory into itself or one of its own descendants.
 */
export function isWithin(child: string, ancestor: string): boolean {
  const c = normalizePath(child);
  const a = normalizePath(ancestor);
  if (c === a) return true;
  // Drop a root's trailing slash so the boundary test is a clean prefix.
  const prefix = a.endsWith('/') ? a : `${a}/`;
  return c.startsWith(prefix);
}

/** The reason a move is not allowed, or null when it is fine. */
export function validateMove(from: string, toDir: string): string | null {
  const source = normalizePath(from);
  const target = normalizePath(toDir);
  if (isWithin(target, source)) {
    return 'Cannot move a folder into itself or a subfolder';
  }
  if (parentDir(source) === target) {
    return 'Already in this folder';
  }
  return null;
}

/**
 * Derives a non-colliding duplicate path for `path`, given the set of names that
 * already exist in the same directory. Produces "name copy.ext", then
 * "name copy 2.ext", and so on.
 */
export function deriveDuplicatePath(path: string, siblingNames: Iterable<string>): string {
  const dir = parentDir(path);
  const original = baseName(path);
  const { stem, ext } = splitExtension(original);
  const taken = new Set(siblingNames);

  const candidate = (suffix: string): string => `${stem} ${suffix}${ext}`;
  let name = candidate('copy');
  let counter = 2;
  while (taken.has(name)) {
    name = candidate(`copy ${counter}`);
    counter += 1;
  }
  return joinPath(dir, name);
}
