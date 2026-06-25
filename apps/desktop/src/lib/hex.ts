/**
 * Formats bytes as a classic hex dump: an offset column, the byte values in hex,
 * and a printable-ASCII gutter. hexDumpBytes is the core (exact for any byte);
 * hexDump is a convenience that encodes text as UTF-8 first. Pure, so it is unit
 * tested. base64ToBytes decodes a native binary file read for the byte path.
 */
const BYTES_PER_ROW = 16;

export function hexDumpBytes(bytes: Uint8Array): string {
  const lines: string[] = [];
  for (let i = 0; i < bytes.length; i += BYTES_PER_ROW) {
    const chunk = bytes.slice(i, i + BYTES_PER_ROW);
    const offset = i.toString(16).padStart(8, '0');
    const hex = Array.from(chunk)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ')
      .padEnd(BYTES_PER_ROW * 3 - 1, ' ');
    const ascii = Array.from(chunk)
      .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.'))
      .join('');
    lines.push(`${offset}  ${hex}  ${ascii}`);
  }
  return lines.join('\n');
}

/** Hex dump of text, encoded as UTF-8 (so multi-byte characters show real bytes). */
export function hexDump(text: string): string {
  return hexDumpBytes(new TextEncoder().encode(text));
}

/** Decode a standard-base64 string (from fs_read_file_base64) into raw bytes. */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
