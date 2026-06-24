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

export { monaco };
