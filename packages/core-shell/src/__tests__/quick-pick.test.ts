import { describe, expect, it } from 'vitest';
import { filterQuickPick, parsePaletteInput, scoreQuickPickItem, type QuickPickItem } from '../index.js';

const files: QuickPickItem[] = [
  { id: 'src/auth/login-form.tsx', label: 'login-form.tsx', description: 'src/auth', keywords: ['src/auth/login-form.tsx'] },
  { id: 'src/auth/use-auth.ts', label: 'use-auth.ts', description: 'src/auth', keywords: ['src/auth/use-auth.ts'] },
  { id: 'src/App.tsx', label: 'App.tsx', description: 'src', keywords: ['src/App.tsx'] },
  { id: 'README.md', label: 'README.md', description: '', keywords: ['README.md'] },
];

describe('filterQuickPick', () => {
  it('returns items in original order for an empty query, capped at the limit', () => {
    expect(filterQuickPick('', files).map((f) => f.id)).toEqual(files.map((f) => f.id));
    expect(filterQuickPick('   ', files, 2).map((f) => f.id)).toEqual([files[0]!.id, files[1]!.id]);
  });

  it('keeps only items that match as a subsequence, best first', () => {
    const result = filterQuickPick('login', files);
    expect(result[0]?.id).toBe('src/auth/login-form.tsx');
    expect(result.every((f) => f.id !== 'README.md')).toBe(true);
  });

  it('matches against the description and keywords, not only the label', () => {
    // "auth" only appears in the folder description / path, never the file name.
    const byFolder = filterQuickPick('auth', files);
    expect(byFolder.map((f) => f.id)).toContain('src/auth/login-form.tsx');
    expect(byFolder.map((f) => f.id)).toContain('src/auth/use-auth.ts');
  });

  it('ranks a label match above a path-only match', () => {
    const result = filterQuickPick('app', files);
    expect(result[0]?.id).toBe('src/App.tsx');
  });

  it('honors the result limit', () => {
    expect(filterQuickPick('', files, 1)).toHaveLength(1);
  });
});

describe('scoreQuickPickItem', () => {
  it('returns null when nothing matches', () => {
    expect(scoreQuickPickItem('zzzz', files[3]!)).toBeNull();
  });
  it('scores a label hit higher than a keyword-only hit', () => {
    const labelHit = scoreQuickPickItem('readme', files[3]!);
    const pathHit = scoreQuickPickItem('auth', files[0]!);
    expect(labelHit).not.toBeNull();
    expect(pathHit).not.toBeNull();
    expect(labelHit as number).toBeGreaterThan(0);
  });
});

describe('parsePaletteInput', () => {
  it('routes a leading > to command mode', () => {
    expect(parsePaletteInput('>open folder', 'files')).toEqual({ mode: 'commands', query: 'open folder' });
  });

  it('routes a leading : to go-to-line', () => {
    expect(parsePaletteInput(':42', 'files')).toEqual({ mode: 'goto', query: '', line: 42 });
  });

  it('routes a leading @ to symbol mode', () => {
    expect(parsePaletteInput('@', 'commands')).toEqual({ mode: 'symbols', query: '' });
    expect(parsePaletteInput('@form', 'files')).toEqual({ mode: 'symbols', query: 'form' });
  });

  it('parses :line:column', () => {
    expect(parsePaletteInput(':42:8', 'commands')).toEqual({ mode: 'goto', query: '', line: 42, column: 8 });
  });

  it('treats a bare : as go-to with no line yet', () => {
    expect(parsePaletteInput(':', 'files')).toEqual({ mode: 'goto', query: '' });
  });

  it('stays in the base mode for ordinary text and trims whitespace', () => {
    expect(parsePaletteInput('  login  ', 'files')).toEqual({ mode: 'files', query: 'login' });
    expect(parsePaletteInput('swarm', 'commands')).toEqual({ mode: 'commands', query: 'swarm' });
  });

  it('routes a leading # to workspace-symbol mode', () => {
    expect(parsePaletteInput('#', 'commands')).toEqual({ mode: 'wsymbols', query: '' });
    expect(parsePaletteInput('#Login', 'files')).toEqual({ mode: 'wsymbols', query: 'Login' });
  });
});
