/**
 * A small, safe Markdown to HTML renderer for the preview. It supports headings,
 * bold and italic, inline code, fenced code blocks, links, unordered lists, and
 * paragraphs. All text is HTML-escaped first and only a known-safe tag set is
 * emitted, and link hrefs are sanitized, so the rendered output cannot inject
 * script. Pure, so every rule is unit tested. A full CommonMark parser is out of
 * scope; this covers the common cases a README uses.
 */

// A control marker (built at runtime so the source stays plain ASCII) that cannot
// appear in user text, used to fence off inline code spans during formatting.
const MARK = String.fromCharCode(0);
const MARK_PATTERN = new RegExp(`${MARK}(\\d+)${MARK}`, 'g');

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Returns a safe href, or null to drop the link (for example javascript:). */
function safeUrl(url: string): string | null {
  const u = url.trim();
  if (u.length === 0 || /["'<>\s]/.test(u)) return null;
  if (/^https?:\/\//i.test(u) || u.startsWith('#') || u.startsWith('/') || /^[\w.][\w./%-]*$/.test(u)) {
    return u;
  }
  return null;
}

/** Apply inline Markdown to a line of block-level text. */
function inlineMarkdown(text: string): string {
  let s = escapeHtml(text);
  const codes: string[] = [];
  s = s.replace(/`([^`]+)`/g, (_match, code: string) => {
    codes.push(code);
    return `${MARK}${codes.length - 1}${MARK}`;
  });
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, url: string) => {
    const href = safeUrl(url);
    return href ? `<a href="${href}">${label}</a>` : label;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(MARK_PATTERN, (_match, n: string) => `<code>${codes[Number(n)]}</code>`);
  return s;
}

export function renderMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let paragraph: string[] = [];
  let i = 0;

  const flushParagraph = (): void => {
    if (paragraph.length > 0) {
      out.push(`<p>${paragraph.map(inlineMarkdown).join('<br>')}</p>`);
      paragraph = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i] ?? '';

    if (line.trimStart().startsWith('```')) {
      flushParagraph();
      i += 1;
      const code: string[] = [];
      while (i < lines.length && !(lines[i] ?? '').trimStart().startsWith('```')) {
        code.push(lines[i] ?? '');
        i += 1;
      }
      i += 1; // skip the closing fence
      out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      const level = heading[1]!.length;
      out.push(`<h${level}>${inlineMarkdown(heading[2]!)}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length) {
        const match = /^[-*]\s+(.*)$/.exec(lines[i] ?? '');
        if (!match) break;
        items.push(`<li>${inlineMarkdown(match[1]!)}</li>`);
        i += 1;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      i += 1;
      continue;
    }

    paragraph.push(line);
    i += 1;
  }

  flushParagraph();
  return out.join('\n');
}
