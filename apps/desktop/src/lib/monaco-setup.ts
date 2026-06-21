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

export { monaco };
