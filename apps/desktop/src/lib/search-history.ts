/**
 * The recent-query history for the search box. Submitting a query pushes it to the
 * front, de-duplicated, capped; Up and Down in the input walk it. Pure, so the
 * reducer is unit tested.
 */
const MAX = 20;
const STORAGE_KEY = 'vsclaude.searchHistory';

export function pushSearchHistory(history: readonly string[], query: string): string[] {
  const q = query.trim();
  if (q.length === 0) return [...history];
  return [q, ...history.filter((entry) => entry !== q)].slice(0, MAX);
}

/**
 * Parse a persisted history blob into a clean string list: drop anything that is
 * not a non-empty string, and cap to MAX. Pure, so corrupt storage cannot throw.
 */
export function parseSearchHistory(raw: string | null): string[] {
  if (!raw) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0).slice(0, MAX);
}

/** Load the persisted search history from localStorage (empty when unavailable). */
export function loadSearchHistory(): string[] {
  if (typeof localStorage === 'undefined') return [];
  return parseSearchHistory(localStorage.getItem(STORAGE_KEY));
}

/** Persist the search history to localStorage (no-op when unavailable). */
export function saveSearchHistory(history: readonly string[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX)));
  } catch {
    // Storage full or blocked: history is a convenience, so swallow.
  }
}
