import { describe, expect, it } from 'vitest';
import {
  buildWorkspaceSymbols,
  codeSymbols,
  filterWorkspaceSymbols,
  outlineSymbols,
} from '../lib/workspace-symbols';

describe('codeSymbols', () => {
  it('captures top-level declarations and skips nested locals', () => {
    const src = ['export function LoginForm() {', '  const valid = true;', '}', 'class Auth {}'].join('\n');
    expect(codeSymbols(src)).toEqual([
      { name: 'LoginForm', line: 1 },
      { name: 'Auth', line: 4 },
    ]);
  });

  it('captures const, type, and interface declarations', () => {
    const src = ['export const config = {};', 'type Id = string;', 'interface Session {}'].join('\n');
    expect(codeSymbols(src).map((s) => s.name)).toEqual(['config', 'Id', 'Session']);
  });

  it('captures Rust top-level items only when rust is enabled', () => {
    const src = ['pub fn run() {}', 'struct Pty {}', 'impl Pty {', '    fn spawn() {}', '}'].join('\n');
    // The nested fn is indented, so it is skipped; impl reports its type.
    expect(codeSymbols(src, true).map((s) => s.name)).toEqual(['run', 'Pty', 'Pty']);
    // Without the rust flag, none of the Rust keywords are matched.
    expect(codeSymbols(src)).toEqual([]);
  });

  it('captures public Rust enum, const, and type items', () => {
    const src = ['pub enum E {}', 'pub const X: u8 = 1;', 'pub(crate) type T = u8;'].join('\n');
    expect(codeSymbols(src, true).map((s) => s.name)).toEqual(['E', 'X', 'T']);
  });

  it('does not treat a top-level JS static line as a symbol', () => {
    // `static` is a Rust keyword in RUST, but rust is off for JS, so it is ignored.
    expect(codeSymbols('static foo = 1;')).toEqual([]);
  });
});

describe('outlineSymbols', () => {
  it('returns markdown headings with their level for .md files', () => {
    expect(outlineSymbols('readme.md', '# Title\n## Sub')).toEqual([
      { name: 'Title', level: 1, line: 1 },
      { name: 'Sub', level: 2, line: 2 },
    ]);
  });

  it('returns flat code declarations for source files', () => {
    expect(outlineSymbols('a.ts', 'export function foo() {}\nclass Bar {}')).toEqual([
      { name: 'foo', level: 1, line: 1 },
      { name: 'Bar', level: 1, line: 2 },
    ]);
  });

  it('applies the Rust matcher for .rs files', () => {
    expect(outlineSymbols('lib.rs', 'pub fn run() {}\nstruct Pty {}')).toEqual([
      { name: 'run', level: 1, line: 1 },
      { name: 'Pty', level: 1, line: 2 },
    ]);
  });

  it('returns nothing for a file with no detectable symbols', () => {
    expect(outlineSymbols('data.json', '{ "a": 1 }')).toEqual([]);
  });
});

describe('buildWorkspaceSymbols', () => {
  it('indexes markdown headings and code declarations', () => {
    const symbols = buildWorkspaceSymbols({
      'a.ts': 'export function foo() {}',
      'b.md': '# Title\n## Sub',
    });
    expect(symbols).toContainEqual({ name: 'foo', file: 'a.ts', line: 1, kind: 'code' });
    expect(symbols).toContainEqual({ name: 'Title', file: 'b.md', line: 1, kind: 'heading' });
  });
});

describe('filterWorkspaceSymbols', () => {
  const symbols = buildWorkspaceSymbols({ 'a.ts': 'function alpha() {}\nfunction beta() {}' });

  it('filters by case-insensitive name substring', () => {
    expect(filterWorkspaceSymbols(symbols, 'ALP').map((s) => s.name)).toEqual(['alpha']);
  });

  it('returns all symbols for an empty query', () => {
    expect(filterWorkspaceSymbols(symbols, '')).toHaveLength(2);
  });
});
