import { markdownSymbols } from './symbols';

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

/** Top-level declarations in a source file, as name and one-based line. */
export function codeSymbols(text: string): Array<{ name: string; line: number }> {
  const out: Array<{ name: string; line: number }> = [];
  text.replace(/\r\n/g, '\n')
    .split('\n')
    .forEach((line, index) => {
      const match = DECL.exec(line) ?? VAR.exec(line);
      if (match) out.push({ name: match[1]!, line: index + 1 });
    });
  return out;
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
      for (const symbol of codeSymbols(content)) {
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
