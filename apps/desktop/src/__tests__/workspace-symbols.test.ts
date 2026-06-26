import { describe, expect, it } from 'vitest';
import {
  buildWorkspaceSymbols,
  codeSymbols,
  cssSymbols,
  filterWorkspaceSymbols,
  jsonSymbols,
  outlineSymbols,
  pythonSymbols,
  tomlSymbols,
  yamlSymbols,
} from '../lib/workspace-symbols';

describe('pythonSymbols', () => {
  it('lists top-level def and class declarations, skipping nested ones', () => {
    const text = [
      'import sys',
      '',
      'def main():',
      '    print("hi")',
      '',
      'class App:',
      '    def run(self):',
      '        pass',
      '',
      'async def fetch():',
      '    pass',
    ].join('\n');
    expect(pythonSymbols(text)).toEqual([
      { name: 'main', line: 3 },
      { name: 'App', line: 6 },
      { name: 'fetch', line: 10 },
    ]);
  });

  it('does not flag a column-0 def or class inside a triple-quoted docstring', () => {
    const text = ['"""', 'def fake():', '    pass', '"""', '', 'def real():', '    pass'].join('\n');
    expect(pythonSymbols(text)).toEqual([{ name: 'real', line: 6 }]);
  });

  it('outlineSymbols routes .py through pythonSymbols at level 1', () => {
    expect(outlineSymbols('app.py', 'def go():\n    pass')).toEqual([{ name: 'go', level: 1, line: 1 }]);
  });
});

describe('tomlSymbols', () => {
  it('lists tables, array-of-tables, and top-level keys before the first table', () => {
    const text = [
      'title = "demo"',
      '[package]',
      'name = "aurora"',
      '[[bin]]',
      'name = "cli"',
      '[deps]',
    ].join('\n');
    expect(tomlSymbols(text)).toEqual([
      { name: 'title', line: 1 },
      { name: 'package', line: 2 },
      { name: 'bin', line: 4 },
      { name: 'deps', line: 6 },
    ]);
  });

  it('skips comments, blank lines, and keys under a table', () => {
    const text = ['# a comment', '', '[a]', 'x = 1', 'y = 2', '[b]'].join('\n');
    expect(tomlSymbols(text)).toEqual([
      { name: 'a', line: 3 },
      { name: 'b', line: 6 },
    ]);
  });

  it('does not treat a bracketed line inside a multi-line string as a table', () => {
    const text = ['[a]', 'desc = """', '[not-a-table]', '"""', '[b]'].join('\n');
    expect(tomlSymbols(text)).toEqual([
      { name: 'a', line: 1 },
      { name: 'b', line: 5 },
    ]);
  });

  it('does not open a phantom block from a triple-quote inside a trailing comment', () => {
    const text = ['x = 1 # has """ here', '[t]', 'y = 2'].join('\n');
    expect(tomlSymbols(text)).toEqual([
      { name: 'x', line: 1 },
      { name: 't', line: 2 },
    ]);
  });

  it('outlineSymbols routes .toml through tomlSymbols at level 1', () => {
    expect(outlineSymbols('Cargo.toml', '[package]')).toEqual([{ name: 'package', level: 1, line: 1 }]);
  });
});

describe('yamlSymbols', () => {
  it('lists top-level keys, skipping nested keys, list items, and comments', () => {
    const text = ['name: aurora', '# a comment', '- top-list', 'build:', '  target: es2022', 'on:', '  - push'].join(
      '\n',
    );
    expect(yamlSymbols(text)).toEqual([
      { name: 'name', line: 1 },
      { name: 'build', line: 4 },
      { name: 'on', line: 6 },
    ]);
  });

  it('keeps the key when the value contains a colon (e.g. a URL)', () => {
    expect(yamlSymbols('homepage: https://example.com')).toEqual([{ name: 'homepage', line: 1 }]);
  });

  it('captures a $-led top-level key like $schema', () => {
    expect(yamlSymbols('$schema: https://json-schema.org/x')).toEqual([{ name: '$schema', line: 1 }]);
  });

  it('ignores a key with no space after the colon (a plain scalar, not a mapping)', () => {
    expect(yamlSymbols('a:b')).toEqual([]);
  });

  it('outlineSymbols routes .yaml/.yml through yamlSymbols at level 1', () => {
    expect(outlineSymbols('c.yml', 'x: 1')).toEqual([{ name: 'x', level: 1, line: 1 }]);
    expect(outlineSymbols('c.yaml', 'y: 2')).toEqual([{ name: 'y', level: 1, line: 1 }]);
  });
});

describe('cssSymbols', () => {
  it('lists top-level selectors with their start lines', () => {
    const text = ['.app {', '  color: red;', '}', '', '.btn:hover {', '  color: blue;', '}'].join('\n');
    expect(cssSymbols(text)).toEqual([
      { name: '.app', line: 1 },
      { name: '.btn:hover', line: 5 },
    ]);
  });

  it('joins a multi-line selector and ignores declarations inside a rule', () => {
    const text = ['.a,', '.b {', '  color: red;', '}'].join('\n');
    expect(cssSymbols(text)).toEqual([{ name: '.a, .b', line: 1 }]);
  });

  it('skips at-rules and does not outline their inner rules, and ignores comments', () => {
    const text = [
      '/* a comment with { braces } */',
      '@media (min-width: 600px) {',
      '  .inner { color: red; }',
      '}',
      '.real {',
      '  color: blue;',
      '}',
    ].join('\n');
    expect(cssSymbols(text)).toEqual([{ name: '.real', line: 5 }]);
  });

  it('ignores braces inside string values and attribute-selector strings', () => {
    const text = ['.a {', '  content: "}";', '}', '[data-x="}"] {', '  color: red;', '}'].join('\n');
    expect(cssSymbols(text)).toEqual([
      { name: '.a', line: 1 },
      { name: '[data-x="}"]', line: 4 },
    ]);
  });

  it('skips bare at-statements ending in a semicolon', () => {
    const text = ["@import url('x.css');", '.a {', '  color: red;', '}'].join('\n');
    expect(cssSymbols(text)).toEqual([{ name: '.a', line: 2 }]);
  });

  it('keeps real rules when /* or */ appear inside string literals (string-aware comments)', () => {
    const text = ['a[x="/*"] {', '  c: 1;', '}', '.real {', '  c: 2;', '}', 'b[y="*/"] {', '  c: 3;', '}'].join(
      '\n',
    );
    expect(cssSymbols(text)).toEqual([
      { name: 'a[x="/*"]', line: 1 },
      { name: '.real', line: 4 },
      { name: 'b[y="*/"]', line: 7 },
    ]);
  });

  it('outlineSymbols routes .css through cssSymbols at level 1', () => {
    expect(outlineSymbols('styles.css', '.x { color: red; }')).toEqual([
      { name: '.x', level: 1, line: 1 },
    ]);
  });
});

describe('jsonSymbols', () => {
  it('lists top-level keys with their lines and ignores nested keys', () => {
    const text = ['{', '  "name": "demo",', '  "nested": {', '    "inner": 1', '  }', '}'].join('\n');
    expect(jsonSymbols(text)).toEqual([
      { name: 'name', line: 2 },
      { name: 'nested', line: 3 },
    ]);
  });

  it('ignores array elements and colons inside string values', () => {
    const text = ['{', '  "url": "http://x:8080",', '  "list": ["a", "b"]', '}'].join('\n');
    expect(jsonSymbols(text)).toEqual([
      { name: 'url', line: 2 },
      { name: 'list', line: 3 },
    ]);
  });

  it('handles escaped quotes in values without ending the string early', () => {
    const text = ['{', '  "a": "say \\"hi\\"",', '  "b": 2', '}'].join('\n');
    expect(jsonSymbols(text)).toEqual([
      { name: 'a', line: 2 },
      { name: 'b', line: 3 },
    ]);
  });

  it('outlineSymbols routes .json files through jsonSymbols at level 1', () => {
    const text = ['{', '  "version": "1.0.0"', '}'].join('\n');
    expect(outlineSymbols('package.json', text)).toEqual([{ name: 'version', level: 1, line: 2 }]);
  });
});

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

  it('returns nothing for a file type with no outline support', () => {
    expect(outlineSymbols('notes.txt', 'plain prose, no declarations here')).toEqual([]);
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
