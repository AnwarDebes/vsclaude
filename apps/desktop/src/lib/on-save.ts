/**
 * On-save text transforms, applied when the editor saves: trim trailing whitespace
 * per line and ensure a single final newline. Both are off by default and driven by
 * settings. Pure, so the transforms are unit tested.
 */
export interface OnSaveOptions {
  trimTrailingWhitespace: boolean;
  insertFinalNewline: boolean;
  /** Collapse extra blank lines at the end of the file to a single final newline. */
  trimFinalNewlines: boolean;
}

export function applyOnSave(content: string, options: OnSaveOptions): string {
  let out = content;
  if (options.trimTrailingWhitespace) {
    out = out
      .split('\n')
      .map((line) => line.replace(/[ \t]+$/, ''))
      .join('\n');
  }
  // Trim before insert, so a file that ends in many blank lines collapses to one
  // final newline rather than the insert step re-adding one after a full trim.
  if (options.trimFinalNewlines) {
    out = out.replace(/\n+$/, '\n');
  }
  if (options.insertFinalNewline && out.length > 0 && !out.endsWith('\n')) {
    out = `${out}\n`;
  }
  return out;
}
