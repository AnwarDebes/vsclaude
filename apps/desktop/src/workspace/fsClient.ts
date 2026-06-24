/**
 * Typed filesystem client for the renderer. Thin wrappers over the contract IPC
 * surface (`call`/`on`) plus the native folder dialog. Everything here is only
 * meaningful inside the Tauri shell; callers guard with `isTauri()` and fall
 * back to the demo experience in a plain browser.
 */
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import type { IpcEventPayload } from '@vsclaude/contracts';
import { call, on } from '../ipc';
import { isTauri } from '../lib/tauri';

export { isTauri };

/** Opens the native folder picker. Returns the chosen path, or null if cancelled. */
export async function pickFolder(): Promise<string | null> {
  const result = await openDialog({ directory: true, multiple: false, title: 'Open Folder' });
  return typeof result === 'string' ? result : null;
}

export const readDir = (path: string) => call('fs.readDir', { path });
export const readFile = (path: string) => call('fs.readFile', { path });
export const writeFile = (path: string, content: string) => call('fs.writeFile', { path, content });
export const stat = (path: string) => call('fs.stat', { path });
export const createFile = (path: string, content?: string) =>
  call('fs.createFile', { path, content });
export const createDir = (path: string) => call('fs.createDir', { path });
export const renamePath = (from: string, to: string) => call('fs.rename', { from, to });
export const deletePath = (path: string) => call('fs.delete', { path });
export const copyPath = (from: string, to: string) => call('fs.copy', { from, to });
export const watchPath = (path: string) => call('fs.watch', { path });
export const unwatchPath = (watchId: string) => call('fs.unwatch', { watchId });
/** Recursively lists files under a folder for the quick-open index. */
export const walkDir = (path: string, limit?: number) => call('fs.walk', { path, limit });

export const onFsChanged = (handler: (payload: IpcEventPayload<'fs:changed'>) => void) =>
  on('fs:changed', handler);
