/**
 * The recent-query history for the search box. Submitting a query pushes it to the
 * front, de-duplicated, capped; Up and Down in the input walk it. Pure, so the
 * reducer is unit tested.
 */
const MAX = 20;

export function pushSearchHistory(history: readonly string[], query: string): string[] {
  const q = query.trim();
  if (q.length === 0) return [...history];
  return [q, ...history.filter((entry) => entry !== q)].slice(0, MAX);
}
