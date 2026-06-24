/**
 * Extracts a document outline from Markdown headings. It powers the Outline view
 * and a Monaco document-symbol provider (so the breadcrumb and Go to Symbol work
 * for Markdown). Headings inside fenced code blocks are ignored. Pure, so the
 * extraction is unit tested.
 */
export interface OutlineItem {
  name: string;
  /** Heading level, 1 to 6. */
  level: number;
  /** One-based line number of the heading. */
  line: number;
}

export function markdownSymbols(text: string): OutlineItem[] {
  const items: OutlineItem[] = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let inFence = false;

  lines.forEach((line, index) => {
    if (line.trimStart().startsWith('```')) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    const match = /^(#{1,6})\s+(.*\S)\s*$/.exec(line);
    if (match) {
      items.push({ name: match[2]!, level: match[1]!.length, line: index + 1 });
    }
  });

  return items;
}
