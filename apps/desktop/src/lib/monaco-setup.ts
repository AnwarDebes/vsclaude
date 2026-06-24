/**
 * Monaco wiring for Vite. The language web workers are imported through Vite's
 * `?worker` so the editor works fully offline in the native app (no CDN), with a
 * dedicated worker per language for real IntelliSense.
 */
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import { loader } from '@monaco-editor/react';
import { findLinks } from './links';
import { findColors, toHex } from './colors';
import { markdownSymbols } from './symbols';
import { jsonDefaults } from 'monaco-editor/esm/vs/language/json/monaco.contribution';
import {
  javascriptDefaults,
  typescriptDefaults,
} from 'monaco-editor/esm/vs/language/typescript/monaco.contribution';
import { SNIPPET_LANGUAGES, snippetsFor } from './snippets';
import { JSON_SCHEMAS } from './json-schemas';
import { TS_INLAY_HINTS } from './inlay-hints';

declare global {
  interface Window {
    MonacoEnvironment?: { getWorker(moduleId: string, label: string): Worker };
  }
}

self.MonacoEnvironment = {
  getWorker(_moduleId: string, label: string): Worker {
    switch (label) {
      case 'json':
        return new jsonWorker();
      case 'css':
      case 'scss':
      case 'less':
        return new cssWorker();
      case 'html':
      case 'handlebars':
      case 'razor':
        return new htmlWorker();
      case 'typescript':
      case 'javascript':
        return new tsWorker();
      default:
        return new editorWorker();
    }
  },
};

// Use the locally bundled Monaco instead of the default CDN loader.
loader.config({ monaco });

// Schema-driven validation and completion for package.json and tsconfig.json.
jsonDefaults.setDiagnosticsOptions({
  validate: true,
  enableSchemaRequest: false,
  schemas: JSON_SCHEMAS,
});

// Inline parameter-name and type hints from the TS and JS workers.
typescriptDefaults.setInlayHintsOptions(TS_INLAY_HINTS);
javascriptDefaults.setInlayHintsOptions(TS_INLAY_HINTS);

// Make URLs clickable in any file: a link provider over the shared findLinks.
const LINK_LANGUAGES = [
  'markdown',
  'plaintext',
  'typescript',
  'javascript',
  'json',
  'css',
  'scss',
  'less',
  'html',
  'rust',
  'python',
  'yaml',
  'ini',
];
for (const language of LINK_LANGUAGES) {
  monaco.languages.registerLinkProvider(language, {
    provideLinks(model) {
      const links: monaco.languages.ILink[] = [];
      const lineCount = model.getLineCount();
      for (let line = 1; line <= lineCount; line += 1) {
        for (const link of findLinks(model.getLineContent(line))) {
          links.push({
            range: new monaco.Range(line, link.start + 1, line, link.end + 1),
            url: link.url,
          });
        }
      }
      return { links };
    },
  });
}

// Show a color swatch and an inline picker for #hex and rgb()/rgba() colors.
const COLOR_LANGUAGES = ['css', 'scss', 'less', 'html', 'markdown', 'json', 'typescript', 'javascript'];
for (const language of COLOR_LANGUAGES) {
  monaco.languages.registerColorProvider(language, {
    provideDocumentColors(model) {
      const colors: monaco.languages.IColorInformation[] = [];
      const lineCount = model.getLineCount();
      for (let line = 1; line <= lineCount; line += 1) {
        for (const match of findColors(model.getLineContent(line))) {
          colors.push({
            range: new monaco.Range(line, match.start + 1, line, match.end + 1),
            color: match.color,
          });
        }
      }
      return colors;
    },
    provideColorPresentations(_model, colorInfo) {
      return [{ label: toHex(colorInfo.color) }];
    },
  });
}

// Built-in snippet completions for TypeScript and JavaScript.
for (const language of SNIPPET_LANGUAGES) {
  monaco.languages.registerCompletionItemProvider(language, {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = new monaco.Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        word.endColumn,
      );
      const suggestions = snippetsFor(language).map((snippet) => ({
        label: snippet.prefix,
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: snippet.body,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        detail: snippet.description,
        documentation: snippet.description,
        range,
      }));
      return { suggestions };
    },
  });
}

// A document-symbol outline for Markdown (headings), so Go to Symbol and the
// breadcrumb work in .md files.
monaco.languages.registerDocumentSymbolProvider('markdown', {
  provideDocumentSymbols(model) {
    return markdownSymbols(model.getValue()).map((symbol) => ({
      name: symbol.name,
      detail: '',
      kind: monaco.languages.SymbolKind.String,
      tags: [],
      range: new monaco.Range(symbol.line, 1, symbol.line, model.getLineMaxColumn(symbol.line)),
      selectionRange: new monaco.Range(symbol.line, 1, symbol.line, 1),
    }));
  },
});

export { monaco };
