/**
 * The line written to the terminal when a shell process exits, surfacing the exit
 * code. Pure, so the wording is unit tested; the panel adds the color (red for a
 * nonzero code) when it writes it.
 */
export function exitMessage(exitCode: number | null): string {
  if (exitCode === null) return '[Process exited]';
  if (exitCode === 0) return '[Process completed]';
  return `[Process exited with code ${exitCode}]`;
}

/** Whether the exit should read as a failure (nonzero code). */
export function exitIsFailure(exitCode: number | null): boolean {
  return exitCode !== null && exitCode !== 0;
}
