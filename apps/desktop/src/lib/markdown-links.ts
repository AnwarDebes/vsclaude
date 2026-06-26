/**
 * Broken-link detection for Markdown files, surfaced as editor markers in the
 * Problems panel. We scan inline links [text](target), skip external and anchor
 * targets, resolve relative targets against the document's directory, and flag any
 * whose resolved path is not in the workspace file set. Kept pure so the parsing,
 * path resolution, and ranges are unit tested without Monaco.
 */
export interface BrokenLink {
  /** The raw link target as written (used for the message). */
  readonly target: string;
  /** One-based line of the target in the document. */
  readonly line: number;
  /** One-based start column of the target. */
  readonly column: number;
  /** One-based end column (exclusive) of the target. */
  readonly endColumn: number;
}

/** Resolve a relative link target against a directory, collapsing . and .. segments. */
export function resolveLinkTarget(dir: string, target: string): string {
  const out = dir === '' ? [] : dir.split('/');
  for (const seg of target.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (out.length > 0) out.pop();
      continue;
    }
    out.push(seg);
  }
  return out.join('/');
}

function indexToPosition(text: string, index: number): { line: number; column: number } {
  let line = 1;
  let lastNewline = -1;
  for (let i = 0; i < index; i += 1) {
    if (text[i] === '\n') {
      line += 1;
      lastNewline = i;
    }
  }
  return { line, column: index - lastNewline };
}

/** Find inline-link targets that do not resolve to a known workspace file. */
export function findBrokenLinks(
  text: string,
  mdPath: string,
  files: readonly string[],
): BrokenLink[] {
  const fileSet = new Set(files);
  const dir = mdPath.includes('/') ? mdPath.slice(0, mdPath.lastIndexOf('/')) : '';
  // Blank fenced and inline code (preserving length and newlines, so positions stay
  // accurate) so a link shown as code is not analyzed as a real link.
  const scanned = text
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/`[^`\n]*`/g, (span) => ' '.repeat(span.length));
  const out: BrokenLink[] = [];
  // Inline links, tolerating an optional CommonMark title and surrounding whitespace
  // after the target: [text](target), [text](target "title"), [text]( target ).
  const linkPattern = /\[[^\]]*\]\(\s*([^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = linkPattern.exec(scanned)) !== null) {
    const rawTarget = match[1]!;
    // Skip external (scheme:), protocol-relative (//), and pure anchor (#) targets.
    if (/^(?:[a-zA-Z][\w+.-]*:|#|\/\/)/.test(rawTarget)) continue;
    // Strip a trailing anchor or query before resolving the file path.
    const target = rawTarget.replace(/[#?].*$/, '');
    if (target === '') continue;
    if (fileSet.has(resolveLinkTarget(dir, target))) continue;
    // The target sits just after the "](" opener (skipping any leading whitespace), so
    // find it from there rather than guessing with lastIndexOf (which a title could fool).
    const afterOpen = match[0].indexOf('](') + 2;
    const targetStart = match.index + match[0].indexOf(rawTarget, afterOpen);
    const pos = indexToPosition(text, targetStart);
    out.push({
      target: rawTarget,
      line: pos.line,
      column: pos.column,
      endColumn: pos.column + rawTarget.length,
    });
  }
  return out;
}
