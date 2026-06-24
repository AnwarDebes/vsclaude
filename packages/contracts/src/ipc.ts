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
  /** Last modification time in epoch milliseconds, when available. */
  mtimeMs?: number;
}

/** Options for a project-wide search. All fields are optional with sane defaults. */
export interface SearchOptions {
  /** Treat the query as a regular expression. Default false (literal). */
  regex?: boolean;
  /** Match case sensitively. Default false. */
  caseSensitive?: boolean;
  /** Match whole words only. Default false. */
  wholeWord?: boolean;
  /** Only search files matching these globs (a whitelist). */
  includeGlobs?: string[];
  /** Skip files matching these globs. */
  excludeGlobs?: string[];
  /** Cap on the number of matches returned. */
  maxResults?: number;
}

/** A matched range within a line, as code-point offsets. */
export interface SearchRange {
  start: number;
  end: number;
}

/** One matching line in a file. */
export interface SearchLineMatch {
  /** One-based line number. */
  line: number;
  /** The full line text (without the trailing newline). */
  text: string;
  /** The matched ranges within `text`, as code-point offsets. */
  ranges: SearchRange[];
}

/** All matches within one file. */
export interface SearchFileResult {
  path: string;
  lines: SearchLineMatch[];
}

/** The result of a project-wide search. */
export interface SearchResult {
  files: SearchFileResult[];
  /** Total number of matches across all files. */
  matchCount: number;
  /** True when the match cap stopped the search before the tree was exhausted. */
  truncated: boolean;
}

/** Metadata about a single path, returned by `fs.stat`. */
export interface FileStat {
  path: string;
  name: string;
  kind: 'file' | 'directory' | 'symlink';
  /** False when the path does not exist; the other fields are then unset. */
  exists: boolean;
  size?: number;
  /** Last modification time in epoch milliseconds. */
  mtimeMs?: number;
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
  'fs.readFile': {
    args: { path: string };
    result: { content: string; encoding: 'utf-8'; mtimeMs: number };
  };
  'fs.writeFile': { args: { path: string; content: string }; result: { mtimeMs: number } };
  'fs.stat': { args: { path: string }; result: FileStat };
  'fs.createFile': { args: { path: string; content?: string }; result: void };
  'fs.createDir': { args: { path: string }; result: void };
  'fs.rename': { args: { from: string; to: string }; result: void };
  'fs.delete': { args: { path: string }; result: void };
  'fs.copy': { args: { from: string; to: string }; result: void };
  'fs.watch': { args: { path: string }; result: { watchId: string } };
  'fs.unwatch': { args: { watchId: string }; result: void };
  /**
   * Recursively lists file paths under a folder for the quick-open index. Skips
   * heavy and noise directories (node_modules, .git, build outputs), never
   * follows a symlink, and caps the result. `truncated` is true when the cap was
   * reached before the tree was exhausted. See specs/QUICK_OPEN.md.
   */
  'fs.walk': {
    args: { path: string; limit?: number };
    result: { files: string[]; truncated: boolean };
  };
  /**
   * Project-wide search. Walks `root` (gitignore-aware) and matches `query`
   * across text files. See specs/SEARCH.md.
   */
  'search.find': {
    args: { root: string; query: string; options?: SearchOptions };
    result: SearchResult;
  };

  'secret.set': { args: { key: string; value: string }; result: void };
  /**
   * Reports only whether a secret is stored and a masked hint (last four
   * characters). The raw value is never returned to the renderer; see
   * specs/SECURITY.md.
   */
  'secret.status': { args: { key: string }; result: { configured: boolean; hint: string } };
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
  'fs.stat',
  'fs.createFile',
  'fs.createDir',
  'fs.rename',
  'fs.delete',
  'fs.copy',
  'fs.watch',
  'fs.unwatch',
  'fs.walk',
  'search.find',
  'secret.set',
  'secret.status',
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
