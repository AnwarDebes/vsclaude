/**
 * On-save text transforms, applied when the editor saves: trim trailing whitespace
 * per line and ensure a single final newline. Both are off by default and driven by
 * settings. Pure, so the transforms are unit tested.
 */
export interface OnSaveOptions {
  trimTrailingWhitespace: boolean;
  insertFinalNewline: boolean;
}

export function applyOnSave(content: string, options: OnSaveOptions): string {
  let out = content;
  if (options.trimTrailingWhitespace) {
    out = out
      .split('\n')
      .map((line) => line.replace(/[ \t]+$/, ''))
      .join('\n');
  }
  if (options.insertFinalNewline && out.length > 0 && !out.endsWith('\n')) {
    out = `${out}\n`;
  }
  return out;
}
