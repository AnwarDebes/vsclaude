/**
 * Helpers for the SVG preview. An SVG is text, so it can be shown as an image
 * through a data URL in an <img>, which renders it without executing any script it
 * contains (unlike inlining the markup). Pure, so it is unit tested.
 */
export function isSvgPath(path: string): boolean {
  return path.toLowerCase().endsWith('.svg');
}

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
