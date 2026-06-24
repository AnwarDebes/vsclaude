/**
 * Finds URLs in a line of text so the editor can turn them into clickable links.
 * Recognizes http and https URLs and bare www. addresses, strips trailing prose
 * punctuation, and returns code-point-safe character offsets. Pure, so the
 * detection is unit tested; the Monaco link provider in monaco-setup uses it.
 */
export interface TextLink {
  /** Start offset of the link in the line (zero-based). */
  start: number;
  /** End offset (exclusive). */
  end: number;
  /** The href to open, with bare www. addresses given an https scheme. */
  url: string;
}

const LINK_RE = /(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi;
const TRAILING = '.,;:!?)';

export function findLinks(text: string): TextLink[] {
  const links: TextLink[] = [];
  for (const match of text.matchAll(LINK_RE)) {
    const index = match.index ?? 0;
    let raw = match[0];
    let end = index + raw.length;
    while (raw.length > 0 && TRAILING.includes(raw[raw.length - 1]!)) {
      raw = raw.slice(0, -1);
      end -= 1;
    }
    if (raw.length === 0) continue;
    const url = /^www\./i.test(raw) ? `https://${raw}` : raw;
    links.push({ start: index, end, url });
  }
  return links;
}
