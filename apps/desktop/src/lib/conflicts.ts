/**
 * Git merge-conflict parsing and resolution. Finds the classic
 * `<<<<<<< / ======= / >>>>>>>` blocks in a file and resolves one by keeping the
 * current side, the incoming side, or both. Pure, so it is unit tested; the editor
 * decorates the regions and the conflict bar applies a resolution.
 */
export interface Conflict {
  /** One-based line of the `<<<<<<<` marker. */
  start: number;
  /** One-based line of the `=======` separator. */
  separator: number;
  /** One-based line of the `>>>>>>>` marker. */
  end: number;
  /** The current-side lines (between the start marker and the separator). */
  current: string[];
  /** The incoming-side lines (between the separator and the end marker). */
  incoming: string[];
}

export type ConflictChoice = 'current' | 'incoming' | 'both';

/** Find all well-formed conflict blocks in the text, in document order. */
export function findConflicts(text: string): Conflict[] {
  const lines = text.split('\n');
  const conflicts: Conflict[] = [];
  let start = -1;
  let separator = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    if (line.startsWith('<<<<<<<')) {
      start = i;
      separator = -1;
    } else if (line.startsWith('=======') && start !== -1) {
      separator = i;
    } else if (line.startsWith('>>>>>>>') && start !== -1 && separator !== -1) {
      conflicts.push({
        start: start + 1,
        separator: separator + 1,
        end: i + 1,
        current: lines.slice(start + 1, separator),
        incoming: lines.slice(separator + 1, i),
      });
      start = -1;
      separator = -1;
    }
  }
  return conflicts;
}

/** Resolve one conflict, returning the new text with that block replaced. */
export function resolveConflict(text: string, conflict: Conflict, choice: ConflictChoice): string {
  const lines = text.split('\n');
  // Sides are arrays of lines, so an empty side ([]) and a single blank line ([''])
  // stay distinct and a genuine blank line is preserved on resolution.
  const replacement =
    choice === 'current'
      ? conflict.current
      : choice === 'incoming'
        ? conflict.incoming
        : [...conflict.current, ...conflict.incoming];
  lines.splice(conflict.start - 1, conflict.end - conflict.start + 1, ...replacement);
  return lines.join('\n');
}
