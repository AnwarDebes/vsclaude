/**
 * Parse `git stash list` output into entries. Each line looks like
 * "stash@{0}: WIP on main: 1a2b3c subject". Pure, so the parsing is unit tested.
 */
export interface StashEntry {
  index: number;
  ref: string;
  description: string;
}

export function parseStashList(raw: string): StashEntry[] {
  const out: StashEntry[] = [];
  for (const line of raw.split('\n')) {
    const match = /^stash@\{(\d+)\}:\s*(.*)$/.exec(line.trim());
    if (match) {
      const index = Number(match[1]);
      out.push({ index, ref: `stash@{${index}}`, description: match[2] ?? '' });
    }
  }
  return out;
}
