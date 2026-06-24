/**
 * Thin typed bridge to the native Rust core. Every call is a no-op-safe wrapper
 * around the Tauri IPC, plus an `isTauri` guard so the same components run in the
 * browser (demo) and in the native app (real PTY, real provider).
 */
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

/** True when running inside the native Tauri shell. */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/* ---- PTY (integrated terminal) ---- */

export async function ptyCreate(
  cols: number,
  rows: number,
  opts?: { shell?: string; cwd?: string },
): Promise<string> {
  const result = await invoke<{ ptyId: string }>('pty_create', {
    cols,
    rows,
    shell: opts?.shell ?? null,
    cwd: opts?.cwd ?? null,
  });
  return result.ptyId;
}
export const ptyWrite = (ptyId: string, data: string): Promise<void> =>
  invoke('pty_write', { ptyId, data });
export const ptyResize = (ptyId: string, cols: number, rows: number): Promise<void> =>
  invoke('pty_resize', { ptyId, cols, rows });
export const ptyKill = (ptyId: string): Promise<void> => invoke('pty_kill', { ptyId });

export const onPtyData = (handler: (p: { ptyId: string; data: string }) => void): Promise<UnlistenFn> =>
  listen<{ ptyId: string; data: string }>('pty:data', (e) => handler(e.payload));
export const onPtyExit = (
  handler: (p: { ptyId: string; exitCode: number | null }) => void,
): Promise<UnlistenFn> =>
  listen<{ ptyId: string; exitCode: number | null }>('pty:exit', (e) => handler(e.payload));

/* ---- Live agent provider ---- */

export const providerAvailable = (command?: string): Promise<boolean> =>
  invoke('provider_available', { command: command ?? null });

export const providerStart = (
  prompt: string,
  opts?: { cwd?: string; command?: string },
): Promise<{ sessionId: string; pid: number }> =>
  invoke('provider_start', { prompt, cwd: opts?.cwd ?? null, command: opts?.command ?? null });

export const onProviderStdout = (
  handler: (p: { sessionId: string; line: string }) => void,
): Promise<UnlistenFn> =>
  listen<{ sessionId: string; line: string }>('provider:stdout', (e) => handler(e.payload));
export const onProviderExit = (
  handler: (p: { sessionId: string; code: number | null }) => void,
): Promise<UnlistenFn> =>
  listen<{ sessionId: string; code: number | null }>('provider:exit', (e) => handler(e.payload));

/* ---- Git (diff review and commit) ---- */

export const gitStatus = (cwd: string): Promise<string> => invoke('git_status', { cwd });
export const gitDiff = (cwd: string, path?: string): Promise<string> =>
  invoke('git_diff', { cwd, path: path ?? null });
export const gitHeadFile = (cwd: string, path: string): Promise<string> =>
  invoke('git_head_file', { cwd, path });
export const gitCommit = (cwd: string, message: string): Promise<{ output: string }> =>
  invoke('git_commit', { cwd, message });
export const gitStage = (cwd: string, paths: string[]): Promise<void> =>
  invoke('git_stage', { cwd, paths });
export const gitUnstage = (cwd: string, paths: string[]): Promise<void> =>
  invoke('git_unstage', { cwd, paths });
export const gitCommitStaged = (cwd: string, message: string): Promise<{ output: string }> =>
  invoke('git_commit_staged', { cwd, message });
export const gitCommitAmend = (cwd: string, message: string): Promise<{ output: string }> =>
  invoke('git_commit_amend', { cwd, message });

export interface BranchList {
  current: string | null;
  branches: string[];
  detached: boolean;
}
export const gitBranches = (cwd: string): Promise<BranchList> => invoke('git_branches', { cwd });
export const gitCheckout = (cwd: string, branch: string): Promise<void> =>
  invoke('git_checkout', { cwd, branch });
export const gitCreateBranch = (cwd: string, name: string): Promise<void> =>
  invoke('git_create_branch', { cwd, name });
export const gitDeleteBranch = (cwd: string, name: string): Promise<void> =>
  invoke('git_delete_branch', { cwd, name });
export const gitRenameBranch = (cwd: string, from: string, to: string): Promise<void> =>
  invoke('git_rename_branch', { cwd, from, to });
export const gitStash = (cwd: string): Promise<void> => invoke('git_stash', { cwd });
export const gitStashPop = (cwd: string): Promise<void> => invoke('git_stash_pop', { cwd });
export const gitStashList = (cwd: string): Promise<string> => invoke('git_stash_list', { cwd });

export interface GitCommit {
  hash: string;
  shortHash: string;
  author: string;
  email: string;
  /** Author date in unix seconds. */
  date: number;
  subject: string;
}
export const gitLog = (cwd: string, limit?: number): Promise<GitCommit[]> =>
  invoke('git_log', { cwd, limit });
export const gitRevert = (cwd: string, hash: string): Promise<string> =>
  invoke('git_revert', { cwd, hash });

export const gitTags = (cwd: string): Promise<string[]> => invoke('git_tags', { cwd });
export const gitCreateTag = (cwd: string, name: string, message?: string): Promise<void> =>
  invoke('git_create_tag', { cwd, name, message });
export const gitDeleteTag = (cwd: string, name: string): Promise<void> =>
  invoke('git_delete_tag', { cwd, name });
export const gitIgnoreAdd = (cwd: string, pattern: string): Promise<void> =>
  invoke('git_ignore_add', { cwd, pattern });
export const gitFetch = (cwd: string): Promise<string> => invoke('git_fetch', { cwd });
export const gitPull = (cwd: string): Promise<string> => invoke('git_pull', { cwd });
export const gitPush = (cwd: string): Promise<string> => invoke('git_push', { cwd });

export interface GitRemote {
  name: string;
  url: string;
}
export const gitRemotes = (cwd: string): Promise<GitRemote[]> => invoke('git_remotes', { cwd });
export const gitRemoteAdd = (cwd: string, name: string, url: string): Promise<void> =>
  invoke('git_remote_add', { cwd, name, url });
export const gitRemoteRemove = (cwd: string, name: string): Promise<void> =>
  invoke('git_remote_remove', { cwd, name });
