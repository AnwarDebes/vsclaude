/**
 * Small, dependency-free runtime guards used throughout the persistence
 * layer. They exist so that parsing code can narrow `unknown` JSON into
 * concrete shapes without reaching for `any`.
 */

/** Narrows a value to a non-null plain object record. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Narrows a value to a finite number (rejects NaN and Infinity). */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Narrows a value to a non-empty string. */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Reads a required string field from a record, throwing the supplied
 * error factory when it is missing or not a string.
 */
export function requireString(
  source: Record<string, unknown>,
  key: string,
  fail: (path: string) => Error,
): string {
  const value = source[key];
  if (typeof value !== 'string') {
    throw fail(key);
  }
  return value;
}

/**
 * Reads a required finite-number field from a record, throwing when it
 * is missing or not a finite number.
 */
export function requireNumber(
  source: Record<string, unknown>,
  key: string,
  fail: (path: string) => Error,
): number {
  const value = source[key];
  if (!isFiniteNumber(value)) {
    throw fail(key);
  }
  return value;
}
