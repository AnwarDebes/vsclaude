/**
 * Picks a file icon and color from a name. A small, theme-light icon set: a folder,
 * a picture for images, and a tinted document for everything else, colored by file
 * type. Pure so the mapping is unit tested; FileIcon draws the shape.
 */
export type FileIconKind = 'folder' | 'image' | 'doc';

export interface FileIconSpec {
  kind: FileIconKind;
  /** A CSS color (hex or a var) used to tint the icon. */
  color: string;
}

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp', 'avif']);

const EXT_COLORS: Record<string, string> = {
  ts: '#3b82f6',
  tsx: '#3b82f6',
  js: '#eab308',
  jsx: '#eab308',
  mjs: '#eab308',
  cjs: '#eab308',
  json: '#eab308',
  md: '#60a5fa',
  markdown: '#60a5fa',
  css: '#ec4899',
  scss: '#ec4899',
  less: '#ec4899',
  html: '#f97316',
  htm: '#f97316',
  rs: '#d97757',
  py: '#3b82f6',
  go: '#22d3ee',
  toml: '#94a3b8',
  yml: '#94a3b8',
  yaml: '#94a3b8',
  ini: '#94a3b8',
  env: '#94a3b8',
  lock: '#94a3b8',
};

const FOLDER_COLOR = '#e0a458';
const IMAGE_COLOR = '#10b981';
const DEFAULT_COLOR = 'var(--color-text-muted)';

/** The icon kind and color for a file or directory name. */
export function fileIconSpec(name: string, isDirectory: boolean): FileIconSpec {
  if (isDirectory) return { kind: 'folder', color: FOLDER_COLOR };
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (IMAGE_EXTS.has(ext)) return { kind: 'image', color: IMAGE_COLOR };
  return { kind: 'doc', color: EXT_COLORS[ext] ?? DEFAULT_COLOR };
}
