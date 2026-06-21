/**
 * The visual arrangement the orchestration view should use for the current
 * worker count.
 *
 * - 'workshop': a cozy, hand-placed scene where every worker gets a distinct
 *   pixel-art station. Best for small swarms where individuality reads clearly.
 * - 'grid': a uniform tiled grid of compact worker cards. Scales to medium
 *   swarms while keeping each worker visible.
 * - 'roster': a dense vertical list. Used for large swarms where a spatial
 *   scene would be too cluttered, trading individuality for density.
 */
export type SwarmLayout = 'workshop' | 'grid' | 'roster';

/**
 * Inclusive upper bound (worker count) for the cozy 'workshop' layout. Counts
 * from 0 through this value render as a workshop scene.
 */
export const WORKSHOP_MAX = 6;

/**
 * Inclusive upper bound (worker count) for the 'grid' layout. Counts above
 * WORKSHOP_MAX through this value render as a grid; anything larger falls back
 * to the dense 'roster'.
 */
export const GRID_MAX = 24;

/**
 * Choose the layout mode for a given number of workers.
 *
 * Thresholds (documented and stable so the view and tests agree):
 *   count <= WORKSHOP_MAX (6)            -> 'workshop'
 *   WORKSHOP_MAX < count <= GRID_MAX (24) -> 'grid'
 *   count > GRID_MAX                      -> 'roster'
 *
 * Negative or non-integer inputs are clamped to 0, which maps to 'workshop'.
 *
 * @param count The number of workers (roster length) to lay out.
 * @returns The layout mode to render.
 */
export function chooseLayout(count: number): SwarmLayout {
  const safe = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;

  if (safe <= WORKSHOP_MAX) {
    return 'workshop';
  }
  if (safe <= GRID_MAX) {
    return 'grid';
  }
  return 'roster';
}
