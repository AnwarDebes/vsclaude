/**
 * Typed client for project-wide search. A thin wrapper over the `search.find`
 * IPC command; only meaningful inside the Tauri shell, so callers guard with
 * `isTauri()` and show an open-a-folder note in the browser demo.
 */
import type { SearchOptions, SearchResult } from '@vsclaude/contracts';
import { call } from '../ipc';

export const searchFind = (
  root: string,
  query: string,
  options?: SearchOptions,
): Promise<SearchResult> => call('search.find', { root, query, options });
