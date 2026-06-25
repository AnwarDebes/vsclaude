/**
 * Pure helpers for the resizable sidebar sash: clamping a size to its bounds and
 * loading a persisted width. Kept here (rather than inline in the component) so the
 * math is unit tested, matching the repo's lib + __tests__ convention.
 */
export const SIDEBAR_MIN = 160;
export const SIDEBAR_MAX = 480;
export const SIDEBAR_DEFAULT = 220;

/** Clamp a size to the inclusive [min, max] range. */
export function clampSize(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Parse a persisted sidebar width, falling back to the default when invalid. */
export function loadSidebarWidth(raw: string | null): number {
  const value = Number(raw);
  return Number.isFinite(value) && value >= SIDEBAR_MIN && value <= SIDEBAR_MAX
    ? value
    : SIDEBAR_DEFAULT;
}
