import type {
  GitBranchInfo,
  GitFileChange,
  GitStatusModel,
} from './model.js';
import { EMPTY_BRANCH_INFO } from './model.js';

/**
 * Parse the branch header line produced by porcelain v1 with the `-b` flag.
 *
 * Examples this handles:
 *   `## main`
 *   `## main...origin/main`
 *   `## main...origin/main [ahead 2]`
 *   `## main...origin/main [ahead 1, behind 3]`
 *   `## HEAD (no branch)`
 *   `## No commits yet on main`
 *
 * @param line The full header line including the leading `## ` marker.
 */
function parseBranchHeader(line: string): GitBranchInfo {
  const body = line.slice(3).trim();

  // Detached HEAD form.
  if (body.startsWith('HEAD (no branch)')) {
    return { ...EMPTY_BRANCH_INFO, detached: true };
  }

  // Brand new repository with no commits yet.
  const noCommits = /^No commits yet on (.+)$/.exec(body);
  if (noCommits) {
    const name = noCommits[1]?.trim();
    return { ...EMPTY_BRANCH_INFO, branch: name, detached: false };
  }

  // Split off the optional "[ahead N, behind M]" trailer.
  let ahead = 0;
  let behind = 0;
  let head = body;
  const trailerStart = body.indexOf(' [');
  if (trailerStart !== -1 && body.endsWith(']')) {
    head = body.slice(0, trailerStart);
    const trailer = body.slice(trailerStart + 2, body.length - 1);
    const aheadMatch = /ahead (\d+)/.exec(trailer);
    const behindMatch = /behind (\d+)/.exec(trailer);
    if (aheadMatch && aheadMatch[1] !== undefined) {
      ahead = Number.parseInt(aheadMatch[1], 10);
    }
    if (behindMatch && behindMatch[1] !== undefined) {
      behind = Number.parseInt(behindMatch[1], 10);
    }
  }

  // Split branch from upstream on the `...` separator.
  const sepIndex = head.indexOf('...');
  let branch: string | undefined;
  let upstream: string | undefined;
  if (sepIndex !== -1) {
    branch = head.slice(0, sepIndex).trim() || undefined;
    upstream = head.slice(sepIndex + 3).trim() || undefined;
  } else {
    branch = head.trim() || undefined;
  }

  const info: GitBranchInfo = {
    ahead,
    behind,
    detached: false,
    ...(branch !== undefined ? { branch } : {}),
    ...(upstream !== undefined ? { upstream } : {}),
  };
  return info;
}

/**
 * Split a porcelain entry body into its path and optional rename source.
 *
 * Rename and copy entries are encoded as `orig -> dest`. Everything else is a
 * single path.
 */
function splitPaths(rest: string): { path: string; origPath?: string } {
  const arrow = rest.indexOf(' -> ');
  if (arrow !== -1) {
    const origPath = rest.slice(0, arrow);
    const path = rest.slice(arrow + 4);
    return { path, origPath };
  }
  return { path: rest };
}

/**
 * Classify a parsed change into staged, unstaged, and untracked buckets.
 *
 * Porcelain v1 uses a two character XY code. X is the index (staged) status
 * and Y is the working tree (unstaged) status. `??` means untracked and `!!`
 * means ignored. A file can land in both the staged and unstaged buckets when
 * both columns are populated (for example `MM`).
 */
function classify(
  change: GitFileChange,
  staged: GitFileChange[],
  unstaged: GitFileChange[],
  untracked: GitFileChange[],
): void {
  const code = change.code;
  const x = code.charAt(0);
  const y = code.charAt(1);

  if (code === '??') {
    untracked.push(change);
    return;
  }
  if (code === '!!') {
    // Ignored files are intentionally dropped from the model.
    return;
  }
  if (x !== ' ' && x !== '?') {
    staged.push(change);
  }
  if (y !== ' ' && y !== '?') {
    unstaged.push(change);
  }
}

/**
 * Parse the output of `git status --porcelain=v1 -b` into a normalized model.
 *
 * The parser is tolerant: blank lines are skipped, an absent header yields
 * empty branch info, and unknown trailers are ignored rather than throwing.
 *
 * @param output Raw stdout from the git status command.
 * @returns A {@link GitStatusModel} with staged, unstaged, and untracked lists.
 */
export function parsePorcelainStatus(output: string): GitStatusModel {
  let branch: GitBranchInfo = EMPTY_BRANCH_INFO;
  const staged: GitFileChange[] = [];
  const unstaged: GitFileChange[] = [];
  const untracked: GitFileChange[] = [];

  const lines = output.split('\n');
  for (const raw of lines) {
    // Porcelain uses LF, but tolerate a trailing CR on Windows pipelines.
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    if (line.length === 0) {
      continue;
    }
    if (line.startsWith('## ')) {
      branch = parseBranchHeader(line);
      continue;
    }
    // A change line is "XY<space>path". The code occupies the first two chars.
    if (line.length < 3) {
      continue;
    }
    const code = line.slice(0, 2);
    const rest = line.slice(3);
    const { path, origPath } = splitPaths(rest);
    const change: GitFileChange = {
      path,
      code,
      ...(origPath !== undefined ? { origPath } : {}),
    };
    classify(change, staged, unstaged, untracked);
  }

  const clean =
    staged.length === 0 && unstaged.length === 0 && untracked.length === 0;

  return { branch, staged, unstaged, untracked, clean };
}
