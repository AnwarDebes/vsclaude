/**
 * Pure helpers for the resizable sidebar sash: clamping a size to its bounds and
 * loading a persisted width. Kept here (rather than inline in the component) so the
 * math is unit tested, matching the repo's lib + __tests__ convention.
 */
export const SIDEBAR_MIN = 160;
export const SIDEBAR_MAX = 480;
export const SIDEBAR_DEFAULT = 220;

export const BOTTOM_MIN = 120;
export const BOTTOM_MAX = 560;
export const BOTTOM_DEFAULT = 248;

/** Clamp a size to the inclusive [min, max] range. */
export function clampSize(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Parse a persisted size, falling back to the default when missing or out of range. */
export function loadSize(raw: string | null, min: number, max: number, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}

/** Parse a persisted sidebar width, falling back to the default when invalid. */
export function loadSidebarWidth(raw: string | null): number {
  return loadSize(raw, SIDEBAR_MIN, SIDEBAR_MAX, SIDEBAR_DEFAULT);
}

/** Parse a persisted bottom-panel height, falling back to the default when invalid. */
export function loadBottomHeight(raw: string | null): number {
  return loadSize(raw, BOTTOM_MIN, BOTTOM_MAX, BOTTOM_DEFAULT);
}
