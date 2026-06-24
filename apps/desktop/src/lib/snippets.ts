/**
 * Built-in editor snippets, surfaced through a Monaco completion provider. The
 * body uses Monaco/TextMate snippet syntax (tabstops $1, $2, $0 and placeholders
 * ${1:name}). Pure data, so the per-language selection is unit tested; the provider
 * in monaco-setup turns these into snippet completions.
 */
export interface Snippet {
  prefix: string;
  body: string;
  description: string;
}

const TS_JS: Snippet[] = [
  { prefix: 'clg', body: 'console.log($1);', description: 'console.log' },
  {
    prefix: 'fn',
    body: 'function ${1:name}(${2:args}) {\n\t$0\n}',
    description: 'function declaration',
  },
  {
    prefix: 'afn',
    body: 'const ${1:name} = (${2:args}) => {\n\t$0\n};',
    description: 'arrow function',
  },
  { prefix: 'imp', body: "import { ${2:member} } from '${1:module}';", description: 'import statement' },
  { prefix: 'todo', body: '// TODO: $0', description: 'TODO comment' },
];

const BY_LANGUAGE: Record<string, Snippet[]> = {
  typescript: TS_JS,
  javascript: TS_JS,
};

/** The snippets available for a Monaco language id. */
export function snippetsFor(languageId: string): Snippet[] {
  return BY_LANGUAGE[languageId] ?? [];
}

/** The language ids that have snippets. */
export const SNIPPET_LANGUAGES = Object.keys(BY_LANGUAGE);
