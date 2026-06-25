/**
 * The set of editor languages a user can switch to, their display labels, and a
 * small content-based detector for files whose extension does not reveal the
 * language. Pure, so the listing and detection are unit tested. The Monaco ids
 * match lib/language.ts (which maps extensions to the same ids).
 */
export const LANGUAGE_LABELS: Record<string, string> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  json: 'JSON',
  css: 'CSS',
  scss: 'SCSS',
  less: 'Less',
  html: 'HTML',
  markdown: 'Markdown',
  rust: 'Rust',
  python: 'Python',
  yaml: 'YAML',
  ini: 'INI',
  shell: 'Shell Script',
  ruby: 'Ruby',
  php: 'PHP',
  xml: 'XML',
  sql: 'SQL',
  plaintext: 'Plain Text',
};

/** A human label for a Monaco language id, falling back to a capitalized id. */
export function languageLabel(id: string): string {
  return LANGUAGE_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

/** The languages offered in the status-bar Change Language Mode picker. */
export const SELECTABLE_LANGUAGES: ReadonlyArray<{ id: string; label: string }> = [
  'typescript',
  'javascript',
  'json',
  'css',
  'scss',
  'less',
  'html',
  'markdown',
  'rust',
  'python',
  'yaml',
  'ini',
  'shell',
  'sql',
  'xml',
  'plaintext',
].map((id) => ({ id, label: languageLabel(id) }));

// Interpreter name (from a shebang) to Monaco language id.
const SHEBANG_LANGUAGES: Record<string, string> = {
  node: 'javascript',
  deno: 'typescript',
  python: 'python',
  python3: 'python',
  bash: 'shell',
  sh: 'shell',
  zsh: 'shell',
  ruby: 'ruby',
  php: 'php',
};

/**
 * Best-effort language detection from a file's content, for files whose extension
 * did not resolve to a language. Reads a shebang line or a couple of unambiguous
 * opening markers. Returns a Monaco language id, or null when nothing matches.
 */
export function detectLanguageFromContent(text: string): string | null {
  const head = text.slice(0, 4096);
  const firstLine = head.split('\n', 1)[0]?.trim() ?? '';

  if (firstLine.startsWith('#!')) {
    // Last path segment of the interpreter, for example "env python3" or "/bin/bash".
    const interpreter = firstLine.replace(/^#!\s*/, '').split(/\s+/).filter(Boolean);
    for (const token of interpreter.reverse()) {
      const name = token.split('/').pop()?.toLowerCase() ?? '';
      if (name === 'env') continue;
      if (SHEBANG_LANGUAGES[name]) return SHEBANG_LANGUAGES[name];
    }
  }

  const trimmed = head.trimStart();
  if (/^<\?php\b/i.test(trimmed)) return 'php';
  if (/^<\?xml\b/i.test(trimmed)) return 'xml';
  if (/^<!doctype html\b/i.test(trimmed) || /^<html\b/i.test(trimmed)) return 'html';
  return null;
}
