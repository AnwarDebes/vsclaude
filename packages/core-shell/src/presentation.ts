/**
 * Presentation helpers that connect the panel tree to the shared contracts.
 *
 * The core shell owns layout, but the rest of the app speaks in terms of the
 * frozen contracts surface (presentation modes, panel definitions). These pure
 * helpers translate between the two without pulling in any UI dependency.
 */

import type { PresentationMode } from '@vsclaude/contracts';
import { collectPanelIds, leaf, type PanelNode } from './panel-tree.js';

/**
 * A reasonable default panel layout for a fresh workspace: a wide editor area
 * on the left and a narrower agent activity column on the right.
 */
export function defaultLayout(): PanelNode {
  return {
    kind: 'split',
    orientation: 'row',
    children: [
      { size: 2, node: leaf('editor') },
      { size: 1, node: leaf('agent-activity') },
    ],
  };
}

/**
 * Pick a layout appropriate for a given presentation mode.
 *
 * "focus" collapses to a single panel so the viewer watches one stream at a
 * time, "cozy" and "pro" use the default split, and any future mode falls back
 * to the default. The mapping is intentionally total over the known modes.
 */
export function layoutForMode(mode: PresentationMode, primaryPanelId: string): PanelNode {
  // Compare via a widened string so this stays valid whatever the exact set of
  // presentation mode literals is. A focus mode shows a single panel, every
  // other known mode (for example cozy or pro) uses the default split.
  if (String(mode) === 'focus') {
    return leaf(primaryPanelId);
  }
  return defaultLayout();
}

/**
 * Validate that every panel id in a layout is unique. Duplicate ids would let a
 * single panel render in two slots, which the renderer cannot keep in sync, so
 * the layout model treats it as invalid.
 */
export function isLayoutValid(node: PanelNode): boolean {
  const ids = collectPanelIds(node);
  return new Set(ids).size === ids.length;
}
