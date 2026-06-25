import { describe, expect, it } from 'vitest';
import {
  clampZoom,
  imageTransform,
  isImagePath,
  isRasterImagePath,
  isSvgPath,
  nextRotation,
  RASTER_IMAGE_EXTENSIONS,
  RESET_VIEW,
  svgDataUrl,
  zoomPercent,
  ZOOM_MAX,
  ZOOM_MIN,
} from '../lib/preview';

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

describe('isRasterImagePath', () => {
  it('matches raster image extensions case-insensitively', () => {
    expect(isRasterImagePath('assets/pixie.png')).toBe(true);
    expect(isRasterImagePath('Photo.JPG')).toBe(true);
    expect(isRasterImagePath('anim.GIF')).toBe(true);
    expect(isRasterImagePath('art.webp')).toBe(true);
  });

  it('recognizes every declared extension (guards against a typo in the list)', () => {
    for (const ext of RASTER_IMAGE_EXTENSIONS) {
      expect(isRasterImagePath(`art${ext}`)).toBe(true);
    }
  });

  it('rejects svg and non-image files', () => {
    expect(isRasterImagePath('logo.svg')).toBe(false);
    expect(isRasterImagePath('app.tsx')).toBe(false);
  });
});

describe('isImagePath', () => {
  it('accepts both svg and raster images', () => {
    expect(isImagePath('logo.svg')).toBe(true);
    expect(isImagePath('pixie.png')).toBe(true);
  });

  it('rejects non-images', () => {
    expect(isImagePath('readme.md')).toBe(false);
  });
});

describe('clampZoom', () => {
  it('keeps values inside the supported range', () => {
    expect(clampZoom(1)).toBe(1);
    expect(clampZoom(100)).toBe(ZOOM_MAX);
    expect(clampZoom(0)).toBe(ZOOM_MIN);
  });
});

describe('zoomPercent', () => {
  it('renders a whole-percent label', () => {
    expect(zoomPercent(1)).toBe('100%');
    expect(zoomPercent(1.25)).toBe('125%');
    expect(zoomPercent(0.5)).toBe('50%');
  });

  it('labels the zoom bounds', () => {
    expect(zoomPercent(ZOOM_MIN)).toBe('25%');
    expect(zoomPercent(ZOOM_MAX)).toBe('400%');
  });
});

describe('nextRotation', () => {
  it('advances by a quarter turn and wraps at 360', () => {
    expect(nextRotation(0)).toBe(90);
    expect(nextRotation(270)).toBe(0);
    expect(nextRotation(360)).toBe(90);
  });
});

describe('imageTransform', () => {
  it('renders the neutral view', () => {
    expect(imageTransform(RESET_VIEW)).toBe('translate(0px, 0px) scale(1) rotate(0deg)');
  });

  it('composes pan, zoom, and rotation', () => {
    expect(imageTransform({ zoom: 1.5, rotation: 90, panX: 10, panY: -20 })).toBe(
      'translate(10px, -20px) scale(1.5) rotate(90deg)',
    );
  });
});

describe('svgDataUrl', () => {
  it('builds an image data URL with the encoded markup', () => {
    const url = svgDataUrl('<svg><rect width="1" height="1"/></svg>');
    expect(url.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    expect(url).toContain('%3Csvg%3E');
  });
});
