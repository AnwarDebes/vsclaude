/**
 * Finds CSS colors in a line of text so the editor can show a color swatch and an
 * inline picker. Recognizes #hex (3, 4, 6, or 8 digits) and rgb()/rgba(), and
 * returns normalized 0..1 components plus the offsets. Pure, so the parsing is
 * unit tested; the Monaco color provider in monaco-setup uses it.
 */
export interface RgbaColor {
  /** 0..1 */
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

export interface ColorMatch {
  start: number;
  end: number;
  color: RgbaColor;
}

const HEX_RE = /#([0-9a-f]{3,8})\b/gi;
const RGB_RE = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/gi;

function parseHex(hex: string): RgbaColor | null {
  let h = hex;
  if (h.length === 3 || h.length === 4) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (h.length !== 6 && h.length !== 8) return null;
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  const a = h.length === 8 ? Number.parseInt(h.slice(6, 8), 16) / 255 : 1;
  return { red: r / 255, green: g / 255, blue: b / 255, alpha: a };
}

export function findColors(text: string): ColorMatch[] {
  const matches: ColorMatch[] = [];

  for (const m of text.matchAll(HEX_RE)) {
    const color = parseHex(m[1]!);
    if (color) matches.push({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length, color });
  }

  for (const m of text.matchAll(RGB_RE)) {
    const r = Number(m[1]);
    const g = Number(m[2]);
    const b = Number(m[3]);
    const a = m[4] !== undefined ? Number(m[4]) : 1;
    if (r <= 255 && g <= 255 && b <= 255 && a <= 1) {
      matches.push({
        start: m.index ?? 0,
        end: (m.index ?? 0) + m[0].length,
        color: { red: r / 255, green: g / 255, blue: b / 255, alpha: a },
      });
    }
  }

  return matches.sort((x, y) => x.start - y.start);
}

/** A #hex string for a color, with an alpha byte only when not fully opaque. */
export function toHex(color: RgbaColor): string {
  const byte = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v * 255)))
      .toString(16)
      .padStart(2, '0');
  const base = `#${byte(color.red)}${byte(color.green)}${byte(color.blue)}`;
  return color.alpha < 1 ? `${base}${byte(color.alpha)}` : base;
}
