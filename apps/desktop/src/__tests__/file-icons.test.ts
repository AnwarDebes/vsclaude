import { describe, expect, it } from 'vitest';
import { fileIconSpec } from '../lib/file-icons';

describe('fileIconSpec', () => {
  it('uses a folder icon for directories', () => {
    expect(fileIconSpec('src', true).kind).toBe('folder');
  });

  it('uses an image icon for image extensions', () => {
    expect(fileIconSpec('logo.png', false).kind).toBe('image');
    expect(fileIconSpec('Banner.SVG', false).kind).toBe('image');
  });

  it('tints documents by file type', () => {
    expect(fileIconSpec('app.tsx', false)).toEqual({ kind: 'doc', color: '#3b82f6' });
    expect(fileIconSpec('main.js', false).color).toBe('#eab308');
    expect(fileIconSpec('Cargo.toml', false).color).toBe('#94a3b8');
  });

  it('falls back to a muted document for unknown types', () => {
    expect(fileIconSpec('LICENSE', false)).toEqual({ kind: 'doc', color: 'var(--color-text-muted)' });
  });
});
