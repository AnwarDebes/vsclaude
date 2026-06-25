/**
 * Finds CSS colors in a line of text so the editor can show a color swatch and an
 * inline picker. Recognizes #hex (3, 4, 6, or 8 digits), rgb()/rgba(), hsl()/hsla(),
 * and (opt-in) CSS named colors, returning normalized 0..1 components plus offsets.
 * Pure, so the parsing is unit tested; the Monaco color provider in monaco-setup
 * uses it (named colors are enabled only for CSS-family languages).
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
const HSL_RE = /hsla?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*(?:,\s*([\d.]+)\s*)?\)/gi;

/** The CSS named colors, as #hex. "transparent" maps to fully transparent black. */
export const NAMED_COLORS: Record<string, string> = {
  transparent: '#00000000',
  aliceblue: '#f0f8ff', antiquewhite: '#faebd7', aqua: '#00ffff', aquamarine: '#7fffd4',
  azure: '#f0ffff', beige: '#f5f5dc', bisque: '#ffe4c4', black: '#000000',
  blanchedalmond: '#ffebcd', blue: '#0000ff', blueviolet: '#8a2be2', brown: '#a52a2a',
  burlywood: '#deb887', cadetblue: '#5f9ea0', chartreuse: '#7fff00', chocolate: '#d2691e',
  coral: '#ff7f50', cornflowerblue: '#6495ed', cornsilk: '#fff8dc', crimson: '#dc143c',
  cyan: '#00ffff', darkblue: '#00008b', darkcyan: '#008b8b', darkgoldenrod: '#b8860b',
  darkgray: '#a9a9a9', darkgreen: '#006400', darkgrey: '#a9a9a9', darkkhaki: '#bdb76b',
  darkmagenta: '#8b008b', darkolivegreen: '#556b2f', darkorange: '#ff8c00', darkorchid: '#9932cc',
  darkred: '#8b0000', darksalmon: '#e9967a', darkseagreen: '#8fbc8f', darkslateblue: '#483d8b',
  darkslategray: '#2f4f4f', darkslategrey: '#2f4f4f', darkturquoise: '#00ced1', darkviolet: '#9400d3',
  deeppink: '#ff1493', deepskyblue: '#00bfff', dimgray: '#696969', dimgrey: '#696969',
  dodgerblue: '#1e90ff', firebrick: '#b22222', floralwhite: '#fffaf0', forestgreen: '#228b22',
  fuchsia: '#ff00ff', gainsboro: '#dcdcdc', ghostwhite: '#f8f8ff', gold: '#ffd700',
  goldenrod: '#daa520', gray: '#808080', green: '#008000', greenyellow: '#adff2f',
  grey: '#808080', honeydew: '#f0fff0', hotpink: '#ff69b4', indianred: '#cd5c5c',
  indigo: '#4b0082', ivory: '#fffff0', khaki: '#f0e68c', lavender: '#e6e6fa',
  lavenderblush: '#fff0f5', lawngreen: '#7cfc00', lemonchiffon: '#fffacd', lightblue: '#add8e6',
  lightcoral: '#f08080', lightcyan: '#e0ffff', lightgoldenrodyellow: '#fafad2', lightgray: '#d3d3d3',
  lightgreen: '#90ee90', lightgrey: '#d3d3d3', lightpink: '#ffb6c1', lightsalmon: '#ffa07a',
  lightseagreen: '#20b2aa', lightskyblue: '#87cefa', lightslategray: '#778899', lightslategrey: '#778899',
  lightsteelblue: '#b0c4de', lightyellow: '#ffffe0', lime: '#00ff00', limegreen: '#32cd32',
  linen: '#faf0e6', magenta: '#ff00ff', maroon: '#800000', mediumaquamarine: '#66cdaa',
  mediumblue: '#0000cd', mediumorchid: '#ba55d3', mediumpurple: '#9370db', mediumseagreen: '#3cb371',
  mediumslateblue: '#7b68ee', mediumspringgreen: '#00fa9a', mediumturquoise: '#48d1cc',
  mediumvioletred: '#c71585', midnightblue: '#191970', mintcream: '#f5fffa', mistyrose: '#ffe4e1',
  moccasin: '#ffe4b5', navajowhite: '#ffdead', navy: '#000080', oldlace: '#fdf5e6',
  olive: '#808000', olivedrab: '#6b8e23', orange: '#ffa500', orangered: '#ff4500',
  orchid: '#da70d6', palegoldenrod: '#eee8aa', palegreen: '#98fb98', paleturquoise: '#afeeee',
  palevioletred: '#db7093', papayawhip: '#ffefd5', peachpuff: '#ffdab9', peru: '#cd853f',
  pink: '#ffc0cb', plum: '#dda0dd', powderblue: '#b0e0e6', purple: '#800080',
  rebeccapurple: '#663399', red: '#ff0000', rosybrown: '#bc8f8f', royalblue: '#4169e1',
  saddlebrown: '#8b4513', salmon: '#fa8072', sandybrown: '#f4a460', seagreen: '#2e8b57',
  seashell: '#fff5ee', sienna: '#a0522d', silver: '#c0c0c0', skyblue: '#87ceeb',
  slateblue: '#6a5acd', slategray: '#708090', slategrey: '#708090', snow: '#fffafa',
  springgreen: '#00ff7f', steelblue: '#4682b4', tan: '#d2b48c', teal: '#008080',
  thistle: '#d8bfd8', tomato: '#ff6347', turquoise: '#40e0d0', violet: '#ee82ee',
  wheat: '#f5deb3', white: '#ffffff', whitesmoke: '#f5f5f5', yellow: '#ffff00',
  yellowgreen: '#9acd32',
};

// Longest names first so the alternation is unambiguous (word boundaries make this
// safe regardless, but it keeps the longest run winning). The negative lookbehind
// skips a name that is part of an identifier or sigil token (a .class, --var, $var,
// @var, or #id), so only standalone color words are decorated.
const NAMED_RE = new RegExp(
  `(?<![\\w.#$@-])(${Object.keys(NAMED_COLORS)
    .sort((a, b) => b.length - a.length)
    .join('|')})\\b`,
  'gi',
);

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

/** Convert HSL (h in degrees, s and l in 0..1) to RGB components in 0..1. */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return { r: r + m, g: g + m, b: b + m };
}

export function findColors(text: string, options: { includeNamed?: boolean } = {}): ColorMatch[] {
  const matches: ColorMatch[] = [];
  const push = (index: number, length: number, color: RgbaColor | null) => {
    if (color) matches.push({ start: index, end: index + length, color });
  };

  for (const m of text.matchAll(HEX_RE)) push(m.index ?? 0, m[0].length, parseHex(m[1]!));

  for (const m of text.matchAll(RGB_RE)) {
    const r = Number(m[1]);
    const g = Number(m[2]);
    const b = Number(m[3]);
    const a = m[4] !== undefined ? Number(m[4]) : 1;
    if (r <= 255 && g <= 255 && b <= 255 && a <= 1) {
      push(m.index ?? 0, m[0].length, { red: r / 255, green: g / 255, blue: b / 255, alpha: a });
    }
  }

  for (const m of text.matchAll(HSL_RE)) {
    const h = Number(m[1]);
    const s = Number(m[2]);
    const l = Number(m[3]);
    const a = m[4] !== undefined ? Number(m[4]) : 1;
    if (s <= 100 && l <= 100 && a <= 1) {
      const { r, g, b } = hslToRgb(h, s / 100, l / 100);
      push(m.index ?? 0, m[0].length, { red: r, green: g, blue: b, alpha: a });
    }
  }

  if (options.includeNamed) {
    for (const m of text.matchAll(NAMED_RE)) {
      const hex = NAMED_COLORS[m[0].toLowerCase()];
      if (hex) push(m.index ?? 0, m[0].length, parseHex(hex.slice(1)));
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
