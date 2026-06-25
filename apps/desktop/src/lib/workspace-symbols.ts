import { markdownSymbols, type OutlineItem } from './symbols';

/**
 * A lightweight workspace-symbol index built from file contents, powering the `#`
 * palette mode. Markdown files contribute their headings; other files contribute
 * top-level declarations found by a regex (no leading indent, so nested locals are
 * skipped). Pure, so the extraction and filtering are unit tested.
 */
export interface WorkspaceSymbol {
  name: string;
  file: string;
  /** One-based line number. */
  line: number;
  kind: 'code' | 'heading';
}

const DECL = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|class|interface|enum|type)\s+([A-Za-z_$][\w$]*)/;
const VAR = /^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)/;
// Rust top-level items, applied only to .rs files so JS/TS keywords (notably
// `static`) are never mis-captured. Covers the common pub/async/unsafe forms.
const RUST = /^(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?(?:unsafe\s+)?(?:fn|struct|trait|impl|mod|union|enum|type|const|static)\s+([A-Za-z_][\w]*)/;

/**
 * Top-level declarations in a source file, as name and one-based line. The Rust
 * matcher is only consulted when `rust` is true (for .rs files), so it cannot
 * mis-read a JavaScript or TypeScript line.
 */
export function codeSymbols(text: string, rust = false): Array<{ name: string; line: number }> {
  const out: Array<{ name: string; line: number }> = [];
  text.replace(/\r\n/g, '\n')
    .split('\n')
    .forEach((line, index) => {
      const match = DECL.exec(line) ?? VAR.exec(line) ?? (rust ? RUST.exec(line) : null);
      if (match) out.push({ name: match[1]!, line: index + 1 });
    });
  return out;
}

/**
 * The Outline view symbols for any file: Markdown headings (with their heading
 * level) or top-level code declarations (rendered flat at level 1). Pure.
 */
export function outlineSymbols(path: string, text: string): OutlineItem[] {
  const lower = path.toLowerCase();
  if (lower.endsWith('.md')) return markdownSymbols(text);
  return codeSymbols(text, lower.endsWith('.rs')).map((symbol) => ({
    name: symbol.name,
    level: 1,
    line: symbol.line,
  }));
}

/** Build the workspace-symbol index from a map of file path to contents. */
export function buildWorkspaceSymbols(files: Record<string, string>): WorkspaceSymbol[] {
  const symbols: WorkspaceSymbol[] = [];
  for (const [file, content] of Object.entries(files)) {
    if (file.endsWith('.md')) {
      for (const heading of markdownSymbols(content)) {
        symbols.push({ name: heading.name, file, line: heading.line, kind: 'heading' });
      }
    } else {
      for (const symbol of codeSymbols(content, file.toLowerCase().endsWith('.rs'))) {
        symbols.push({ name: symbol.name, file, line: symbol.line, kind: 'code' });
      }
    }
  }
  return symbols;
}

/** Filter symbols by a case-insensitive name substring, capped. */
export function filterWorkspaceSymbols(
  symbols: readonly WorkspaceSymbol[],
  query: string,
  limit = 50,
): WorkspaceSymbol[] {
  const q = query.trim().toLowerCase();
  const matches = q ? symbols.filter((s) => s.name.toLowerCase().includes(q)) : symbols;
  return matches.slice(0, limit);
}
