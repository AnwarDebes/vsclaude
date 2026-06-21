/**
 * The IPC protocol between the Tauri Rust core and the React renderer.
 *
 * Two channels of communication:
 * - Commands: request and response, invoked from the renderer (`invoke`).
 * - Events: fire and forget pushes from the core to the renderer (`emit`).
 *
 * Both sides import these types so the boundary is statically checked end to
 * end. The Rust side mirrors these names; keep them in lockstep.
 */
import type { AgentEvent } from './agent-event.js';
import type { ProviderSessionOptions } from './provider.js';
import { IPC_PROTOCOL_VERSION } from './version.js';

/** A single filesystem entry returned by directory listing. */
export interface FsEntry {
  name: string;
  path: string;
  kind: 'file' | 'directory' | 'symlink';
  /** Size in bytes for files. */
  size?: number;
}

/**
 * The command surface. Each entry declares its argument and result types.
 * The renderer calls `invoke(name, args)` and gets back `result`.
 */
export interface IpcCommandMap {
  'core.version': { args: Record<string, never>; result: { protocol: number; app: string } };

  'session.start': {
    args: { provider: string; options: ProviderSessionOptions };
    result: { sessionId: string };
  };
  'session.send': { args: { sessionId: string; input: string }; result: void };
  'session.respondPermission': {
    args: { sessionId: string; requestId: string; decision: 'allow' | 'deny'; remember?: boolean };
    result: void;
  };
  'session.stop': { args: { sessionId: string }; result: void };

  'pty.create': {
    args: { cols: number; rows: number; shell?: string; cwd?: string };
    result: { ptyId: string };
  };
  'pty.write': { args: { ptyId: string; data: string }; result: void };
  'pty.resize': { args: { ptyId: string; cols: number; rows: number }; result: void };
  'pty.kill': { args: { ptyId: string }; result: void };

  'fs.readDir': { args: { path: string }; result: FsEntry[] };
  'fs.readFile': { args: { path: string }; result: { content: string; encoding: 'utf-8' } };
  'fs.writeFile': { args: { path: string; content: string }; result: void };
  'fs.watch': { args: { path: string }; result: { watchId: string } };
  'fs.unwatch': { args: { watchId: string }; result: void };

  'secret.set': { args: { key: string; value: string }; result: void };
  'secret.get': { args: { key: string }; result: { value: string | null } };
  'secret.delete': { args: { key: string }; result: void };

  'git.status': { args: { repo: string }; result: { staged: string[]; unstaged: string[]; branch: string } };
}

export type IpcCommandName = keyof IpcCommandMap;
export type IpcCommandArgs<N extends IpcCommandName> = IpcCommandMap[N]['args'];
export type IpcCommandResult<N extends IpcCommandName> = IpcCommandMap[N]['result'];

/**
 * The event surface: payloads the core pushes to the renderer. The renderer
 * subscribes with `listen(name, handler)`.
 */
export interface IpcEventMap {
  'agent:event': AgentEvent;
  'pty:data': { ptyId: string; data: string };
  'pty:exit': { ptyId: string; exitCode: number | null };
  'fs:changed': { watchId: string; path: string; kind: 'created' | 'modified' | 'deleted' };
  'core:error': { message: string; fatal: boolean };
}

export type IpcEventName = keyof IpcEventMap;
export type IpcEventPayload<N extends IpcEventName> = IpcEventMap[N];

/** Canonical command names, handy for the Rust side and tests. */
export const IPC_COMMANDS = [
  'core.version',
  'session.start',
  'session.send',
  'session.respondPermission',
  'session.stop',
  'pty.create',
  'pty.write',
  'pty.resize',
  'pty.kill',
  'fs.readDir',
  'fs.readFile',
  'fs.writeFile',
  'fs.watch',
  'fs.unwatch',
  'secret.set',
  'secret.get',
  'secret.delete',
  'git.status',
] as const satisfies readonly IpcCommandName[];

/** Canonical event names. */
export const IPC_EVENTS = [
  'agent:event',
  'pty:data',
  'pty:exit',
  'fs:changed',
  'core:error',
] as const satisfies readonly IpcEventName[];

export { IPC_PROTOCOL_VERSION };
