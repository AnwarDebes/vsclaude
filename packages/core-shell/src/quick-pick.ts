/**
 * The reusable quick-pick framework for the vsclaude shell.
 *
 * The command palette is one consumer, but the same ranked, filterable list
 * powers file quick-open, the branch picker, terminal profiles, the theme
 * picker, and project search later. This module is the pure logic: a generic
 * item shape, a ranker that reuses the command palette's subsequence scorer, and
 * the prefix router that turns a single palette input into a typed intent. The
 * React UI lives in the desktop app and is a thin projection of these functions.
 */

import { subsequenceScore } from './command-registry.js';

/** A single row a quick-pick can show and filter. */
export interface QuickPickItem {
  /** Stable unique identifier, returned when the row is chosen. */
  readonly id: string;
  /** The primary label shown for the row. */
  readonly label: string;
  /** Secondary, dimmer text shown after the label (for example a folder path). */
  readonly description?: string;
  /** Extra terms that should also match the query (for example a full path). */
  readonly keywords?: readonly string[];
}

/**
 * Score one item against a query, taking the best across its label,
 * description, and keywords. The label is weighted highest so a query that hits
 * the visible name outranks one that only hits a path or a synonym. Returns null
 * when nothing matches.
 */
export function scoreQuickPickItem(query: string, item: QuickPickItem): number | null {
  let best: number | null = null;
  const consider = (raw: number | null, weight: number): void => {
    if (raw === null) return;
    const weighted = raw * weight;
    if (best === null || weighted > best) best = weighted;
  };

  consider(subsequenceScore(query, item.label), 1);
  if (item.description !== undefined) {
    consider(subsequenceScore(query, item.description), 0.7);
  }
  if (item.keywords) {
    for (const keyword of item.keywords) {
      consider(subsequenceScore(query, keyword), 0.85);
    }
  }
  return best;
}

/**
 * Filter and rank items against a query.
 *
 * An empty or whitespace-only query returns the items in their original order,
 * capped at `limit`, so a freshly opened picker shows a stable, predictable list.
 * A non-empty query keeps only items that match as a subsequence and sorts them
 * best first, with the label as a stable tie breaker, then caps the result.
 */
export function filterQuickPick<T extends QuickPickItem>(
  query: string,
  items: readonly T[],
  limit = 50,
): T[] {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return items.slice(0, limit);
  }

  const scored: { item: T; score: number }[] = [];
  for (const item of items) {
    const score = scoreQuickPickItem(trimmed, item);
    if (score !== null) {
      scored.push({ item, score });
    }
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.item.label.localeCompare(b.item.label);
  });
  return scored.slice(0, limit).map((entry) => entry.item);
}

/** Which kind of list the palette should show for the current input. */
export type PaletteMode = 'commands' | 'files' | 'goto' | 'symbols' | 'wsymbols';

/** The parsed intent of a palette input string. */
export interface ParsedPaletteInput {
  readonly mode: PaletteMode;
  /** The remaining text to filter by, with any prefix and surrounding space removed. */
  readonly query: string;
  /** Target line for go-to mode, when a number was typed. */
  readonly line?: number;
  /** Target column for go-to mode, when `:line:column` was typed. */
  readonly column?: number;
}

/**
 * Route a single palette input to a typed intent based on its leading character.
 *
 * - A leading `>` means command mode, whatever the base mode is.
 * - A leading `:` means go to line, optionally `:line:column`. A bare `:` with no
 *   number yields go-to mode with no line, which the caller treats as a no-op
 *   until a number is typed.
 * - Anything else stays in `base`, the mode the palette was opened in.
 *
 * A leading `@` means document-symbol navigation (Go to Symbol in the active
 * editor) and `#` means workspace-symbol search across indexed files.
 */
export function parsePaletteInput(
  raw: string,
  base: 'commands' | 'files',
): ParsedPaletteInput {
  if (raw.startsWith('>')) {
    return { mode: 'commands', query: raw.slice(1).trim() };
  }
  if (raw.startsWith('@')) {
    return { mode: 'symbols', query: raw.slice(1).trim() };
  }
  if (raw.startsWith('#')) {
    return { mode: 'wsymbols', query: raw.slice(1).trim() };
  }
  if (raw.startsWith(':')) {
    const rest = raw.slice(1).trim();
    const match = /^(\d+)(?::(\d+))?/.exec(rest);
    if (!match) {
      return { mode: 'goto', query: '' };
    }
    const line = Number.parseInt(match[1] as string, 10);
    const column = match[2] !== undefined ? Number.parseInt(match[2], 10) : undefined;
    return { mode: 'goto', query: '', line, column };
  }
  return { mode: base, query: raw.trim() };
}
