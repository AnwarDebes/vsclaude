import { describe, expect, it } from 'vitest';
import { isSvgPath, svgDataUrl } from '../lib/preview';

describe('isSvgPath', () => {
  it('matches .svg case-insensitively', () => {
    expect(isSvgPath('icons/logo.svg')).toBe(true);
    expect(isSvgPath('LOGO.SVG')).toBe(true);
  });

  it('rejects other files', () => {
    expect(isSvgPath('app.tsx')).toBe(false);
    expect(isSvgPath('photo.png')).toBe(false);
  });
});

describe('svgDataUrl', () => {
  it('builds an image data URL with the encoded markup', () => {
    const url = svgDataUrl('<svg><rect width="1" height="1"/></svg>');
    expect(url.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    expect(url).toContain('%3Csvg%3E');
  });
});
