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
 * Top-level CSS selectors (the rules of the stylesheet root), with the line each
 * selector begins on. Block comments are stripped first; brace depth is tracked so
 * only depth-0 rules are emitted (declarations inside a rule and the inner rules of
 * an at-rule like @media are ignored), and at-rules themselves (starting with @) and
 * bare statements ending in ; are skipped. Pure, so it is unit tested.
 */
export function cssSymbols(text: string): Array<{ name: string; line: number }> {
  const stripped = text;
  const out: Array<{ name: string; line: number }> = [];
  let depth = 0;
  let line = 1;
  let sel = '';
  let selStart = -1;
  for (let i = 0; i < stripped.length; i += 1) {
    const ch = stripped[i]!;
    if (ch === '\n') {
      line += 1;
      if (depth === 0 && sel.trim() !== '') sel += ' ';
      continue;
    }
    if (ch === '/' && stripped[i + 1] === '*') {
      // A block comment, handled in-loop (after string handling) so a /* or */ that
      // appears inside a string literal is never mistaken for a comment delimiter.
      i += 2;
      while (i < stripped.length && !(stripped[i] === '*' && stripped[i + 1] === '/')) {
        if (stripped[i] === '\n') line += 1;
        i += 1;
      }
      i += 1; // land on the closing '/'; the loop's i += 1 moves past it
      continue;
    }
    if (ch === '"' || ch === "'") {
      // A quoted string (attribute selector value or a declaration value): consume it
      // whole so braces inside it do not change depth. Keep it in the selector at depth 0.
      const quote = ch;
      if (depth === 0) {
        if (sel.trim() === '') selStart = line;
        sel += ch;
      }
      i += 1;
      while (i < stripped.length && stripped[i] !== quote) {
        if (stripped[i] === '\\') {
          if (depth === 0) sel += stripped[i];
          i += 1;
        }
        if (i < stripped.length) {
          if (stripped[i] === '\n') line += 1;
          if (depth === 0) sel += stripped[i];
          i += 1;
        }
      }
      if (depth === 0 && i < stripped.length) sel += quote; // closing quote
      continue;
    }
    if (depth === 0 && ch === '{') {
      const name = sel.trim().replace(/\s+/g, ' ');
      if (name !== '' && !name.startsWith('@')) out.push({ name, line: selStart });
      sel = '';
      selStart = -1;
      depth += 1;
    } else if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      if (depth > 0) depth -= 1;
      sel = '';
      selStart = -1;
    } else if (depth === 0 && ch === ';') {
      // A bare at-statement (e.g. @import url(...);) -- not a selector.
      sel = '';
      selStart = -1;
    } else if (depth === 0) {
      if (sel.trim() === '' && /\S/.test(ch)) selStart = line;
      sel += ch;
    }
  }
  return out;
}

/**
 * Top-level keys of a JSON document, with the line each key appears on. A small
 * string-aware scan tracks brace/bracket depth so only keys of the root object
 * (depth 1) are emitted; keys of nested objects, array elements, and colons inside
 * string values are ignored. Pure, so it is unit tested.
 */
export function jsonSymbols(text: string): Array<{ name: string; line: number }> {
  const out: Array<{ name: string; line: number }> = [];
  let depth = 0;
  let line = 1;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\n') {
      line += 1;
      i += 1;
    } else if (ch === '"') {
      const startLine = line;
      let name = '';
      i += 1;
      while (i < text.length && text[i] !== '"') {
        if (text[i] === '\\') {
          i += 1;
          if (i < text.length) {
            if (text[i] === '\n') line += 1;
            name += text[i];
            i += 1;
          }
          continue;
        }
        if (text[i] === '\n') line += 1;
        name += text[i];
        i += 1;
      }
      i += 1; // closing quote
      if (depth === 1) {
        let j = i;
        while (j < text.length && /\s/.test(text[j]!)) j += 1;
        if (text[j] === ':') out.push({ name, line: startLine });
      }
    } else {
      if (ch === '{' || ch === '[') depth += 1;
      else if (ch === '}' || ch === ']') depth -= 1;
      i += 1;
    }
  }
  return out;
}

/**
 * Top-level (column-0) mapping keys of a YAML document, with the line each begins on.
 * Indented keys, list items, comment lines, and bare scalars are skipped; the value
 * after the colon (including URLs with their own colons) is ignored. Quoted keys are
 * not parsed (best-effort). Pure, so it is unit tested.
 */
export function yamlSymbols(text: string): Array<{ name: string; line: number }> {
  const out: Array<{ name: string; line: number }> = [];
  text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .forEach((raw, index) => {
      const match = /^([A-Za-z_$][\w.$-]*)\s*:(\s|$)/.exec(raw);
      if (match) out.push({ name: match[1]!, line: index + 1 });
    });
  return out;
}

/**
 * TOML structure for the Outline view: [table] and [[array-of-table]] headers, plus
 * top-level keys that appear before the first table. Keys under a table are skipped
 * (the table header represents them). Comments (full-line or trailing) and blank lines
 * are ignored, and the contents of multi-line basic/literal strings (""" / ''') are
 * skipped so a bracketed line inside one is not mistaken for a table. Pure, so it is
 * unit tested.
 */
export function tomlSymbols(text: string): Array<{ name: string; line: number }> {
  const out: Array<{ name: string; line: number }> = [];
  let seenTable = false;
  let inBlock = false;
  let delim = '';
  text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .forEach((raw, index) => {
      if (inBlock) {
        if (raw.includes(delim)) inBlock = false;
        return;
      }
      const line = raw.trim();
      if (line === '' || line.startsWith('#')) return;
      const table = /^\[\[?\s*([^\][]+?)\s*\]\]?/.exec(line);
      if (table) {
        out.push({ name: table[1]!, line: index + 1 });
        seenTable = true;
      } else if (!seenTable) {
        const key = /^([A-Za-z0-9_."'-]+)\s*=/.exec(line);
        if (key) out.push({ name: key[1]!, line: index + 1 });
      }
      // Scan for a multi-line-string opener only in the part of the line before an
      // unquoted '#', so a triple-quote inside a trailing comment cannot falsely open
      // a block and swallow later tables.
      let scan = line;
      let quote = '';
      for (let k = 0; k < line.length; k += 1) {
        const c = line[k]!;
        if (quote) {
          if (c === quote) quote = '';
        } else if (c === '"' || c === "'") {
          quote = c;
        } else if (c === '#') {
          scan = line.slice(0, k);
          break;
        }
      }
      for (const candidate of ['"""', "'''"]) {
        if ((scan.split(candidate).length - 1) % 2 === 1) {
          inBlock = true;
          delim = candidate;
          break;
        }
      }
    });
  return out;
}

/**
 * Top-level (column-0) Python def and class declarations, with the line each begins on.
 * Indented (nested) defs are skipped, matching the flat coverage of the brace languages.
 * Pure, so it is unit tested.
 */
export function pythonSymbols(text: string): Array<{ name: string; line: number }> {
  const out: Array<{ name: string; line: number }> = [];
  let inBlock = false;
  let delim = '';
  text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .forEach((raw, index) => {
      if (inBlock) {
        if (raw.includes(delim)) inBlock = false;
        return;
      }
      const match = /^(?:async\s+)?(?:def|class)\s+([A-Za-z_]\w*)/.exec(raw);
      if (match) out.push({ name: match[1]!, line: index + 1 });
      // Enter a triple-quoted string block (e.g. a docstring) so a column-0 def/class
      // inside it is not mistaken for a declaration. Scan for the opener only before an
      // unquoted '#', so a triple-quote inside a comment does not start a phantom block.
      let scan = raw;
      let quote = '';
      for (let k = 0; k < raw.length; k += 1) {
        const c = raw[k]!;
        if (quote !== '') {
          if (c === quote) quote = '';
        } else if (c === '"' || c === "'") {
          quote = c;
        } else if (c === '#') {
          scan = raw.slice(0, k);
          break;
        }
      }
      for (const candidate of ['"""', "'''"]) {
        if ((scan.split(candidate).length - 1) % 2 === 1) {
          inBlock = true;
          delim = candidate;
          break;
        }
      }
    });
  return out;
}

/**
 * The Outline view symbols for any file: Markdown headings (with their heading
 * level), JSON top-level keys, CSS selectors, YAML top-level keys, TOML tables,
 * Python defs and classes, or top-level code declarations (rendered flat at level 1).
 * Pure.
 */
export function outlineSymbols(path: string, text: string): OutlineItem[] {
  const lower = path.toLowerCase();
  if (lower.endsWith('.md')) return markdownSymbols(text);
  if (lower.endsWith('.json')) {
    return jsonSymbols(text).map((symbol) => ({ name: symbol.name, level: 1, line: symbol.line }));
  }
  if (lower.endsWith('.css')) {
    return cssSymbols(text).map((symbol) => ({ name: symbol.name, level: 1, line: symbol.line }));
  }
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) {
    return yamlSymbols(text).map((symbol) => ({ name: symbol.name, level: 1, line: symbol.line }));
  }
  if (lower.endsWith('.toml')) {
    return tomlSymbols(text).map((symbol) => ({ name: symbol.name, level: 1, line: symbol.line }));
  }
  if (lower.endsWith('.py')) {
    return pythonSymbols(text).map((symbol) => ({ name: symbol.name, level: 1, line: symbol.line }));
  }
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
