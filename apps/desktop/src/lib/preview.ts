/**
 * Helpers for the image preview. An SVG is text, so it can be shown as an image
 * through a data URL in an <img>, which renders it without executing any script it
 * contains (unlike inlining the markup). Raster images are matched by extension
 * and shown from their own source (a data URL in the browser demo). Pure, so it
 * is unit tested.
 */
export function isSvgPath(path: string): boolean {
  return path.toLowerCase().endsWith('.svg');
}

/** Raster image extensions the viewer can render through an <img> source. */
export const RASTER_IMAGE_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.bmp',
  '.ico',
  '.avif',
];

export function isRasterImagePath(path: string): boolean {
  const lower = path.toLowerCase();
  return RASTER_IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

const RASTER_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  avif: 'image/avif',
};

/** The MIME type for a raster image path, for building a data URL from its bytes. */
export function rasterImageMime(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return RASTER_MIME[ext] ?? 'application/octet-stream';
}

/** Any previewable image, raster or SVG. */
export function isImagePath(path: string): boolean {
  return isSvgPath(path) || isRasterImagePath(path);
}

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Zoom bounds and step for the image viewer. */
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 4;
export const ZOOM_STEP = 0.25;

/** Clamp a zoom factor into the supported range. */
export function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

/** A whole-percent label for a zoom factor, for example 1.25 becomes "125%". */
export function zoomPercent(zoom: number): string {
  return `${Math.round(zoom * 100)}%`;
}

/** The pan, zoom, and rotation state of the image viewport. */
export interface ImageView {
  zoom: number;
  /** Rotation in degrees. */
  rotation: number;
  /** Pan offset in pixels. */
  panX: number;
  panY: number;
}

/** The neutral view: no pan, no rotation, 100 percent zoom. */
export const RESET_VIEW: ImageView = { zoom: 1, rotation: 0, panX: 0, panY: 0 };

/** The next clockwise quarter turn, wrapped to the range 0 to 359 degrees. */
export function nextRotation(rotation: number): number {
  return (((rotation + 90) % 360) + 360) % 360;
}

/** A CSS transform for the viewport: pan, then zoom, then rotate. */
export function imageTransform(view: ImageView): string {
  return `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom}) rotate(${view.rotation}deg)`;
}
