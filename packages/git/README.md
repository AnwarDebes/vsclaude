# @vsclaude/git

Pure TypeScript git domain logic for the vsclaude IDE. This package parses the
output of `git status --porcelain=v1 -b` into a normalized, UI agnostic model,
summarizes that model into a compact human string for status bars, and maps git
operations (commit, push, branch, and friends) onto the normalized `AgentEvent`
stream that drives the cozy pixel-art experience. It has no runtime
dependencies beyond `@vsclaude/contracts`.

## What lives here

- `model.ts`: the `GitStatusModel`, `GitFileChange`, and `GitBranchInfo` shapes
  plus `EMPTY_BRANCH_INFO`.
- `parse.ts`: `parsePorcelainStatus`, a tolerant porcelain v1 parser that
  partitions changes into staged, unstaged, and untracked buckets and reads the
  branch header (upstream, ahead, behind, detached, and fresh repos).
- `summarize.ts`: `summarizeStatus` for a one line summary and `branchLabel`
  for a compact branch indicator.
- `events.ts`: `gitActionEvent`, `captionForAction`, `isGitAction`, and the
  `GIT_ACTIONS` list that turn git operations into `git_action` agent events.

## Usage

```ts
import {
  parsePorcelainStatus,
  summarizeStatus,
  gitActionEvent,
} from '@vsclaude/git';

const model = parsePorcelainStatus(
  ['## main...origin/main [ahead 2]', 'A  src/a.ts', '?? notes.md'].join('\n'),
);

summarizeStatus(model); // "1 staged, 1 untracked"
model.branch.ahead; // 2

const event = gitActionEvent('commit', {
  provider: 'claude-code',
  message: 'feat: add parser',
});
event.payload.caption; // "Saving your work to git."
```

## Status

This is the initial logic layer: parsing, summarizing, and event mapping in
pure TypeScript with full unit coverage. The React panel and native git process
integration (spawning git, watching the working tree, and streaming live status)
are tracked in `ROADMAP.md` and arrive in a later phase.
