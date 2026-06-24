# Source Control panel

Status: building. This spec covers the daily git workflow part of catalog section
5.9 (Source control and git): a Source Control view with staged and changes
groups, per-file and bulk staging, a staged commit, and a branch picker.

## Goal

The status bar already shows the branch and change count, and the review overlay
already commits everything at once. This slice adds the panel a developer actually
works in: stage and unstage individual files, see staged and unstaged grouped the
way VS Code does, commit just what is staged, and switch or create a branch. It
reuses the existing porcelain parser and the quick-pick filter, and the git engine
stays a thin, correct wrapper over the git CLI.

## Scope

In scope for this slice:

- New git commands in the Rust core: `git_stage`, `git_unstage`,
  `git_commit_staged`, `git_branches`, `git_checkout`, and `git_create_branch`.
  These follow the existing git command convention (thin CLI wrappers, errors
  carry git stderr) and are reached through `lib/tauri.ts`, like the other git
  commands, not the typed IPC map (git has always lived outside it).
- A pure `scmGroups` helper in `@vsclaude/git` that partitions the status model
  into Staged Changes and Changes (working-tree plus untracked).
- A Source Control panel in the bottom drawer: a commit message box and a Commit
  button (commits the staged set), a Staged Changes group and a Changes group with
  per-file stage and unstage buttons and stage-all and unstage-all on the headers,
  and a branch control that opens an inline filterable picker (reusing
  filterQuickPick) to switch branches or create a new one. Clicking a file opens
  it in the editor.
- The bottom drawer gains a third option (Problems, Search, Source Control); Ctrl
  or Cmd plus Shift plus G toggles Source Control, matching VS Code.
- The status-bar branch refreshes after a panel action (stage, commit, checkout)
  through a shared refresh nonce.

Explicit non-goals for this slice (tracked elsewhere in the matrix):

- Push, pull, fetch, and sync (network and credentials).
- Staging individual hunks or lines.
- Discard, clean, reset, and other destructive actions: they need the confirmation
  gating that is its own matrix item.
- Merge, rebase, cherry-pick, stash, tags, blame, history graph, and the diff
  editor on a file (5.4). Clicking a file opens it, not a diff.

## Contracts

No typed IPC map change (git lives in `lib/tauri.ts` by existing convention). The
new commands and their renderer wrappers:

```
git_stage(cwd, paths: string[]) -> void
git_unstage(cwd, paths: string[]) -> void
git_commit_staged(cwd, message) -> { output }
git_branches(cwd) -> { current: string | null; branches: string[]; detached: boolean }
git_checkout(cwd, branch) -> void
git_create_branch(cwd, name) -> void
```

## Acceptance criteria

1. `git_stage` adds the given paths to the index; `git_unstage` moves them back to
   the working tree; `git_commit_staged` commits only the staged set;
   `git_branches` lists local branches and the current one; `git_create_branch`
   creates and switches. Cargo tests cover stage, commit, branch, and unstage on a
   temporary repository.
2. `scmGroups` returns the staged entries and the working-tree-plus-untracked
   entries, with a combined `scmChangeCount`. Unit tested.
3. The panel shows the two groups, stages and unstages per file and in bulk,
   commits the staged set (the button is disabled with an empty message or nothing
   staged), and refreshes after each action.
4. The branch control opens a filterable list of branches; choosing one switches,
   and typing a new name offers to create it.
5. Ctrl or Cmd plus Shift plus G opens Source Control; it shares the single bottom
   slot with Problems and Search.
6. With no workspace open (the browser demo), the panel shows a note to open a
   folder rather than failing.
7. Build, typecheck, lint, unit tests, the Playwright suite, `cargo check`, and the
   new cargo tests are green, and the matrix rows for 5.9 are updated.

## Validation checklist

- Unit (TS): `scmGroups` and `scmChangeCount`.
- Unit (Rust): stage, commit-staged, branch list and create, and unstage on a
  temp repo.
- End to end: a Playwright test opens Source Control and asserts the panel and (in
  the demo) the open-a-folder note, and the single-slot behavior with the others.
