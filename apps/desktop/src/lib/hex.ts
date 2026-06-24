/**
 * Formats text as a classic hex dump: an offset column, the byte values in hex, and
 * a printable-ASCII gutter. Bytes are the low 8 bits of each code unit, which is
 * exact for ASCII and good enough to inspect a file. Pure, so it is unit tested.
 */
const BYTES_PER_ROW = 16;

export function hexDump(text: string): string {
  const lines: string[] = [];
  for (let i = 0; i < text.length; i += BYTES_PER_ROW) {
    const chunk = text.slice(i, i + BYTES_PER_ROW);
    const offset = i.toString(16).padStart(8, '0');
    const hex = Array.from(chunk)
      .map((ch) => (ch.charCodeAt(0) & 0xff).toString(16).padStart(2, '0'))
      .join(' ')
      .padEnd(BYTES_PER_ROW * 3 - 1, ' ');
    const ascii = Array.from(chunk)
      .map((ch) => {
        const code = ch.charCodeAt(0);
        return code >= 32 && code < 127 ? ch : '.';
      })
      .join('');
    lines.push(`${offset}  ${hex}  ${ascii}`);
  }
  return lines.join('\n');
}
