import { describe, expect, it } from 'vitest';
import { buildWorkspaceSymbols, codeSymbols, filterWorkspaceSymbols } from '../lib/workspace-symbols';

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
