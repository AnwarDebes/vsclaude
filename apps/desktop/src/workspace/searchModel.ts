/**
 * Pure view-model helpers for the Search panel: splitting a result line into
 * highlighted and plain segments, and summarizing a result. Kept separate from
 * the component so the tricky offset logic is unit tested without a DOM.
 */
import type { SearchRange, SearchResult } from '@vsclaude/contracts';

/** A piece of a line, flagged as a match or not, for highlighting. */
export interface LineSegment {
  text: string;
  match: boolean;
}

/**
 * Split a line into matched and unmatched segments by its match ranges. The
 * ranges are code-point offsets, so the line is indexed by code point (via the
 * spread) to stay correct past ASCII. Ranges are sorted and clamped, overlapping
 * or out-of-order ranges are merged into a left-to-right walk, and any gap
 * becomes a plain segment. Empty input yields a single plain segment.
 */
export function splitLineByRanges(text: string, ranges: readonly SearchRange[]): LineSegment[] {
  const chars = [...text];
  if (ranges.length === 0) {
    return [{ text, match: false }];
  }

  const clamped = ranges
    .map((r) => ({ start: Math.max(0, Math.min(r.start, chars.length)), end: Math.max(0, Math.min(r.end, chars.length)) }))
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start);

  // Merge overlapping and adjacent ranges so a run of matches renders as one
  // highlighted segment rather than several touching ones.
  const merged: { start: number; end: number }[] = [];
  for (const range of clamped) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }

  const segments: LineSegment[] = [];
  let cursor = 0;
  for (const range of merged) {
    if (range.start > cursor) {
      segments.push({ text: chars.slice(cursor, range.start).join(''), match: false });
    }
    segments.push({ text: chars.slice(range.start, range.end).join(''), match: true });
    cursor = range.end;
  }
  if (cursor < chars.length) {
    segments.push({ text: chars.slice(cursor).join(''), match: false });
  }
  return segments;
}

/** Count the files and matches in a result. */
export function summarizeSearch(result: SearchResult): { fileCount: number; matchCount: number } {
  return { fileCount: result.files.length, matchCount: result.matchCount };
}
