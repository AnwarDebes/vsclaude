/**
 * Maps a file path to a Monaco language id. Shared by the editor and the diff
 * view so they classify files the same way.
 */
const LANG_BY_EXT: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  json: 'json',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  md: 'markdown',
  rs: 'rust',
  py: 'python',
  toml: 'ini',
  yml: 'yaml',
  yaml: 'yaml',
};

/** The Monaco language id for a path, or an explicit override, defaulting to plaintext. */
export function languageForPath(path?: string, explicit?: string): string {
  if (explicit) return explicit;
  const ext = path?.split('.').pop()?.toLowerCase() ?? '';
  return LANG_BY_EXT[ext] ?? 'plaintext';
}
