/**
 * Restore the browser demo's active file across a reload. The active path is
 * persisted to localStorage; on load we only honor it when it still names a known
 * file, otherwise we fall back to the default. Kept pure so the validation is unit
 * tested without a DOM.
 */
export function parseActiveFile(
  saved: string | null,
  validPaths: readonly string[],
  fallback: string,
): string {
  if (saved !== null && saved.length > 0 && validPaths.includes(saved)) return saved;
  return fallback;
}
