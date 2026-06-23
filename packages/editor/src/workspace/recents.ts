/**
 * The recent-projects model: a pure, ordered, de-duplicated, capped list with
 * stable serialization. The renderer persists this to local storage; keeping the
 * logic here makes it unit-testable without a browser.
 */
import { normalizePath } from './paths.js';

/** One entry in the recent-projects list. */
export interface RecentProject {
  /** Absolute, normalized path to the project folder. */
  readonly path: string;
  /** Display name (its final segment). */
  readonly name: string;
  /** When it was last opened, epoch milliseconds. */
  readonly lastOpenedMs: number;
}

/** The default cap on how many recents are remembered. */
export const RECENTS_CAP = 12;

/**
 * Adds (or refreshes) a project at the front of the list, de-duplicated by path
 * and capped. The caller supplies `nowMs` so the function stays deterministic.
 */
export function addRecent(
  list: readonly RecentProject[],
  project: { path: string; name: string },
  nowMs: number,
  cap: number = RECENTS_CAP,
): RecentProject[] {
  const path = normalizePath(project.path);
  const without = list.filter((entry) => normalizePath(entry.path) !== path);
  const next: RecentProject[] = [{ path, name: project.name, lastOpenedMs: nowMs }, ...without];
  return next.slice(0, Math.max(0, cap));
}

/** Removes a project from the list by path. */
export function removeRecent(list: readonly RecentProject[], path: string): RecentProject[] {
  const target = normalizePath(path);
  return list.filter((entry) => normalizePath(entry.path) !== target);
}

/** Serializes the list to a JSON string for storage. */
export function serializeRecents(list: readonly RecentProject[]): string {
  return JSON.stringify(list);
}

/**
 * Parses a stored JSON string back into a validated list. Any malformed entry is
 * dropped rather than throwing, so a corrupt store never breaks startup.
 */
export function parseRecents(raw: string | null | undefined): RecentProject[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const result: RecentProject[] = [];
  for (const item of data) {
    if (
      item &&
      typeof item === 'object' &&
      typeof (item as RecentProject).path === 'string' &&
      typeof (item as RecentProject).name === 'string' &&
      typeof (item as RecentProject).lastOpenedMs === 'number'
    ) {
      const entry = item as RecentProject;
      result.push({
        path: normalizePath(entry.path),
        name: entry.name,
        lastOpenedMs: entry.lastOpenedMs,
      });
    }
  }
  return result;
}
