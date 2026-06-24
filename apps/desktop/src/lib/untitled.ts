/**
 * Naming for untitled scratchpad files. When no folder is open, New Untitled File
 * opens one of these in the editor. Pure so the naming and the check are tested.
 */
const PREFIX = 'Untitled-';

export function untitledName(n: number): string {
  return `${PREFIX}${n}`;
}

export function isUntitled(path: string): boolean {
  return path.startsWith(PREFIX);
}
