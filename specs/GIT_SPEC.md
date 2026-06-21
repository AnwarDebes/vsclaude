# Git Spec

This document is the complete contract for the version-control subsystem in vsclaude, the cozy pixel-art IDE where a developer watches an AI coding agent work through living animation bound to real events. It covers the Git UI surface (status, staged and unstaged sections, inline and full diffs, staging, commit, amend, branch create and switch, and history), the way `git_action` AgentEvents trigger Pixie git celebrations, the Rust-side integration approach (the `git2` crate as primary path with a controlled shell-out fallback), and the safety model around destructive operations. It is a contract other engineers build against, not an overview. Where Git work crosses other subsystems it links to [Architecture](./ARCHITECTURE.md), the [Agent Event Schema](./AGENT_EVENT_SCHEMA.md), the [Mascot System](./MASCOT_SYSTEM.md), and the [Providers Spec](./PROVIDERS_SPEC.md).

## Table of contents

- [1. Scope and principles](#1-scope-and-principles)
- [2. Package and module map](#2-package-and-module-map)
- [3. Rust integration approach: git2 vs shell](#3-rust-integration-approach-git2-vs-shell)
- [4. The GitRepo command surface (IPC)](#4-the-gitrepo-command-surface-ipc)
- [5. Status model](#5-status-model)
- [6. Diff model: inline and full](#6-diff-model-inline-and-full)
- [7. Staging and unstaging](#7-staging-and-unstaging)
- [8. Commit and amend](#8-commit-and-amend)
- [9. Branches: create and switch](#9-branches-create-and-switch)
- [10. History](#10-history)
- [11. The Git UI](#11-the-git-ui)
- [12. git_action AgentEvents and Pixie celebrations](#12-git_action-agentevents-and-pixie-celebrations)
- [13. Safety around destructive operations](#13-safety-around-destructive-operations)
- [14. Live updates and watching](#14-live-updates-and-watching)
- [15. Error model](#15-error-model)
- [16. Test matrix](#16-test-matrix)
- [17. Invariants and non-goals](#17-invariants-and-non-goals)

## 1. Scope and principles

The Git subsystem has two distinct roles, and keeping them separate is the central design decision of this spec.

1. **User-driven Git.** The human uses the Git panel to inspect status, read diffs, stage hunks, commit, amend, create and switch branches, and browse history. These actions are initiated by the renderer and executed by the Rust core.
2. **Agent-driven Git.** When the coding agent runs `git` (for example `git commit` or `git checkout -b`), its provider adapter emits a `git_action` [AgentEvent](./AGENT_EVENT_SCHEMA.md). vsclaude does **not** run that command on the agent's behalf; the agent already ran it inside its own process. vsclaude observes the event, refreshes the panel, and lets Pixie celebrate.

Three principles constrain everything below:

- **The Rust core owns Git.** As with all OS-touching work in [Architecture](./ARCHITECTURE.md), the renderer never shells out, never touches `.git`, and never imports a JS Git library. It calls typed IPC commands and renders the results.
- **Truthful by construction.** The panel is a projection of real repository state read fresh from disk. There is no optimistic local model of the index that can drift from the real index. Every mutation is followed by a re-read.
- **Destructive operations are gated.** Any operation that can lose committed or uncommitted work requires an explicit, typed confirmation token. There is no silent force.

## 2. Package and module map

```
packages/
  git/
    src/
      types.ts            # GitStatus, FileEntry, DiffFile, Hunk, CommitInfo, BranchInfo
      commands.ts         # typed IPC wrappers (invoke<...>('git_status', ...))
      store.ts            # Zustand git store (status, selection, diff cache)
      diff.ts             # unified-diff parser -> Hunk[] for the renderer
      confirm.ts          # destructive-operation confirmation tokens
      celebrate.ts        # git_action -> Pixie git directive bridge
    test/
apps/desktop/
  src-tauri/
    src/
      git/
        mod.rs            # GitRepo facade, command handlers
        status.rs         # status enumeration (git2)
        diff.rs           # diff generation (git2 + unified text)
        stage.rs          # add / reset path / apply hunk
        commit.rs         # commit, amend
        branch.rs         # list / create / switch
        history.rs        # revwalk -> CommitInfo
        shell.rs          # guarded shell-out fallback
        safety.rs         # destructive-op classification + token check
```

The frozen shared types live in `packages/git/src/types.ts` and are mirrored exactly by `serde` structs on the Rust side. The mirror is verified by a contract test that serializes a Rust fixture and parses it with the TypeScript Zod schema.

## 3. Rust integration approach: git2 vs shell

vsclaude uses **`git2` (the libgit2 binding) as the primary engine** and a **narrow, explicitly allow-listed shell-out as a fallback**. This is a deliberate hybrid, not an accident.

### Why git2 is primary

| Property | git2 | shelling to `git` |
| --- | --- | --- |
| Structured results | Native objects (no text parsing) | Parse stdout, version-fragile |
| Performance | In-process, no fork per call | Fork plus exec per call |
| No external dependency | Bundled libgit2 | Requires `git` on PATH |
| Error typing | Typed `git2::Error` with classes | Exit code plus stderr scraping |
| Streaming large diffs | Callback-based, bounded memory | Buffer whole stdout |

Using `git2` means status, diff, stage, commit, branch, and history are all computed from libgit2 objects, so the panel never depends on the user having a specific `git` version installed or on locale-dependent output formatting.

### Why a shell fallback still exists

Some operations are either not exposed cleanly by libgit2 or are safer to delegate to the user's real `git` so that hooks, credential helpers, and config (`commit.gpgsign`, `core.hooksPath`, signing, custom merge drivers) behave exactly as they do on the command line. The fallback is used for a **fixed allow-list only**:

```rust
/// The ONLY subcommands the shell fallback may run. Anything else is rejected
/// before a process is spawned. No user string is ever interpolated into the
/// command line; every argument is passed as a separate argv element.
const SHELL_ALLOWLIST: &[&str] = &[
    "commit",   // to honor hooks, GPG signing, and commit.template
    "checkout", // branch switch when a hook or sparse config is involved
    "fetch",    // network op, delegate credentials to the user's git
    "pull",
    "push",
];
```

Rules for the shell path, enforced in `shell.rs`:

- **No shell interpretation.** Commands are spawned with an argument vector, never a single string passed to `sh -c`. There is no globbing, no `;`, no `&&`, no interpolation. A path that looks like `--force` is still passed as a literal positional argument after a `--` separator.
- **`--` end-of-options separator** is inserted before any user-supplied paths so a crafted filename cannot become a flag.
- **Working directory is pinned** to the validated repository root, never to a caller-supplied path.
- **stdout and stderr are captured**, never streamed to a PTY, and surfaced as a typed `GitError`.

A small Rust enum records which engine handled a call so the UI can show it in the detail drawer:

```rust
pub enum GitEngine { Libgit2, Shell }
```

## 4. The GitRepo command surface (IPC)

All Git IPC commands are namespaced `git_*` and are registered on the Tauri command bridge described in [Architecture](./ARCHITECTURE.md). Every command takes a validated repository handle and returns a typed result or a `GitError`. The renderer reaches them through thin wrappers in `packages/git/src/commands.ts`.

```ts
// packages/git/src/commands.ts (shape, abbreviated)
export const git = {
  status:        () => invoke<GitStatus>('git_status'),
  diffFile:      (p: DiffRequest) => invoke<DiffFile>('git_diff_file', p),
  stagePaths:    (paths: string[]) => invoke<GitStatus>('git_stage_paths', { paths }),
  unstagePaths:  (paths: string[]) => invoke<GitStatus>('git_unstage_paths', { paths }),
  stageHunk:     (h: HunkRef) => invoke<GitStatus>('git_stage_hunk', h),
  commit:        (m: CommitRequest) => invoke<CommitResult>('git_commit', m),
  amend:         (m: AmendRequest) => invoke<CommitResult>('git_amend', m),
  branches:      () => invoke<BranchInfo[]>('git_branches'),
  createBranch:  (b: CreateBranchRequest) => invoke<BranchInfo>('git_create_branch', b),
  switchBranch:  (b: SwitchBranchRequest) => invoke<GitStatus>('git_switch_branch', b),
  log:           (q: LogQuery) => invoke<CommitInfo[]>('git_log', q),
  // destructive operations require a confirmation token (section 13)
  discardPaths:  (r: DiscardRequest) => invoke<GitStatus>('git_discard_paths', r),
  hardReset:     (r: HardResetRequest) => invoke<GitStatus>('git_hard_reset', r),
};
```

Every mutating command returns the **freshly re-read** `GitStatus` (or the relevant updated object) so the renderer never has to guess what changed. This is the "re-read after mutate" invariant.

## 5. Status model

`GitStatus` is the single source of truth for the panel. It is computed by `status.rs` from a single `git2::Statuses` enumeration, partitioned into staged and unstaged buckets, with rename and conflict detection on.

```ts
// packages/git/src/types.ts
export type FileState =
  | 'added' | 'modified' | 'deleted' | 'renamed'
  | 'untracked' | 'conflicted' | 'typechange';

export interface FileEntry {
  path: string;            // repo-relative, forward slashes on all platforms
  origPath?: string;       // present when renamed
  state: FileState;
  staged: boolean;         // which bucket it appears in
  binary: boolean;         // diff suppressed, byte-size shown instead
  additions: number;       // line counts for the inline gutter, -1 if binary
  deletions: number;
}

export interface GitStatus {
  branch: string | null;   // null = detached HEAD
  detachedHead?: string;   // short sha when detached
  upstream?: { ahead: number; behind: number; name: string };
  staged: FileEntry[];
  unstaged: FileEntry[];
  conflicted: FileEntry[];
  clean: boolean;          // true when staged + unstaged + conflicted are empty
  operation?: 'merge' | 'rebase' | 'cherry-pick' | 'revert'; // in-progress state
}
```

Notes:

- A file modified in the working tree and also staged appears in **both** `staged` and `unstaged` with the appropriate `state`, exactly like `git status` shows index and worktree columns separately.
- Paths are always normalized to forward slashes so the renderer key is stable across Windows and POSIX. The Rust side converts at the boundary.
- `operation` is read from the repository state (`git2::Repository::state`) so the UI can warn that a merge or rebase is in progress and adjust which actions are offered.

## 6. Diff model: inline and full

The panel offers two diff presentations, both produced by `diff.rs` and parsed once on the Rust side into a structured `DiffFile`. The renderer never re-parses raw unified text; it renders structured hunks.

```ts
export interface DiffLine {
  kind: 'context' | 'add' | 'del';
  oldNo?: number;
  newNo?: number;
  content: string;
}

export interface Hunk {
  id: string;              // stable hash of header + offsets, used for stage-hunk
  header: string;          // e.g. @@ -12,7 +12,9 @@
  oldStart: number; oldLines: number;
  newStart: number; newLines: number;
  lines: DiffLine[];
}

export interface DiffFile {
  path: string;
  origPath?: string;
  binary: boolean;
  hunks: Hunk[];
  staged: boolean;         // diff of index vs HEAD (true) or worktree vs index (false)
}
```

- **Inline diff** is the compact view shown directly under a file row in the list. It renders the first N hunks (default 3, configurable) with a "show full diff" affordance. It is the same `DiffFile`, just visually truncated.
- **Full diff** opens the file in a Monaco diff editor (side by side, or unified per user preference). Monaco receives the original and modified blobs read through the existing file IPC, so syntax highlighting and folding work.
- **Binary files** carry `binary: true`, no hunks, and the UI shows old and new byte sizes instead of lines.
- Diffs are requested per file and cached in `store.ts` keyed by `path + staged + headSha`. The cache is invalidated whenever a new `GitStatus` arrives with a different head or different entry counts.

The line count `additions` / `deletions` shown in the file row gutter comes from the same diff, so the row badge and the expanded diff can never disagree.

## 7. Staging and unstaging

Staging operates at two granularities.

| Granularity | Command | git2 mechanism |
| --- | --- | --- |
| Whole file | `git_stage_paths` / `git_unstage_paths` | `Index::add_path` / reset index entry to HEAD |
| Single hunk | `git_stage_hunk` | apply hunk to the index via `git2::apply` with `ApplyLocation::Index` |

```rust
// stage.rs (sketch)
pub fn stage_paths(repo: &Repository, paths: &[PathBuf]) -> Result<(), GitError> {
    let mut index = repo.index()?;
    for p in paths {
        if p_is_deleted(repo, p)? {
            index.remove_path(p)?;
        } else {
            index.add_path(p)?;     // handles add + modify
        }
    }
    index.write()?;                  // persist to .git/index
    Ok(())
}
```

- **Unstage** resets the index entry for a path back to its HEAD version (or removes it from the index if the path is newly added), matching `git reset HEAD -- <path>` semantics, but done through libgit2 so no process is forked.
- **Hunk staging** parses the selected `Hunk` back into a minimal unified patch and applies it to the index only. This is the trickiest path; it is covered by golden-file tests in section 16 because off-by-one line offsets are the classic failure.
- After any stage or unstage, the handler re-reads status and returns it, honoring the re-read invariant.

## 8. Commit and amend

```ts
export interface CommitRequest {
  message: string;
  signoff?: boolean;       // appends Signed-off-by from git config
  allowEmpty?: boolean;
}
export interface AmendRequest {
  message?: string;        // omit to keep the existing message
}
export interface CommitResult {
  sha: string;
  shortSha: string;
  summary: string;
  engine: GitEngine;       // 'libgit2' or 'shell'
}
```

Behavior:

- A commit requires a non-empty `message` unless `allowEmpty` is set. The UI disables the commit button and shows inline validation when the message is empty or only whitespace.
- If the repository config has `commit.gpgsign=true`, or a `commit-msg` / `pre-commit` hook exists, the handler **routes through the shell allow-list** (`git commit`) so signing and hooks run exactly as on the command line. Otherwise it commits through `git2` directly for speed. The chosen `engine` is returned so the detail drawer can show it.
- The author and committer identity come from the resolved git config (`user.name`, `user.email`). If identity is missing, the command fails with a typed `MissingIdentity` error and the UI prompts the user to set it rather than committing with a placeholder.

Amend is treated as a **rewrite of an unpushed commit** and therefore is **gated when the current `HEAD` is already pushed** to its upstream. See section 13: amending a published commit is classified destructive because it changes history that others may have.

```rust
// commit.rs (amend gate)
pub fn amend(repo: &Repository, req: AmendRequest, token: Option<ConfirmToken>)
    -> Result<CommitResult, GitError> {
    if head_is_pushed(repo)? {
        require_token(token, DestructiveOp::AmendPublished)?; // section 13
    }
    // ... reword/recommit HEAD ...
}
```

## 9. Branches: create and switch

```ts
export interface BranchInfo {
  name: string;
  isHead: boolean;
  upstream?: string;
  ahead?: number;
  behind?: number;
  lastCommit: { shortSha: string; summary: string; ts: number };
}
export interface CreateBranchRequest { name: string; checkout: boolean; from?: string; }
export interface SwitchBranchRequest { name: string; }
```

- **Create branch** validates the name with `git2::Branch::name_is_valid` before doing anything, rejecting names with spaces, control characters, or `git`-reserved patterns. The new branch points at `from` (default `HEAD`). If `checkout` is true, it switches after creation.
- **Switch branch** performs a safe checkout. libgit2 checkout uses `CheckoutBuilder::safe()`, which **aborts rather than overwriting** uncommitted changes that would conflict. If the switch would clobber dirty files, the command returns a `WouldOverwrite` error listing the affected paths, and the UI offers to stash, commit, or cancel. vsclaude never silently discards work to make a switch succeed.
- Switching to a branch whose checkout triggers hooks (or under sparse-checkout config) routes through the shell allow-list (`git checkout`) so the user's environment is honored.

## 10. History

History is a `revwalk` over the commit graph, paginated.

```ts
export interface LogQuery {
  ref?: string;            // default HEAD
  limit: number;           // page size, default 50
  cursor?: string;         // sha to continue after
  path?: string;           // file history when set
}
export interface CommitInfo {
  sha: string; shortSha: string;
  summary: string; body: string;
  author: { name: string; email: string; ts: number };
  parents: string[];       // 2+ parents = merge commit
  refs: string[];          // branch/tag names pointing here
}
```

- The walk is topological with time ordering and is paginated by cursor so large repositories never load the whole history at once.
- When `path` is set, the walk is filtered to commits that touched that path (file history), which powers the per-file history view.
- Selecting a commit loads its diff against its first parent through the same `DiffFile` machinery used for working-tree diffs, so the history detail view and the staging diff view share one renderer.

## 11. The Git UI

The Git panel is a left-rail surface in the renderer. It is a pure consumer of the git store, mirroring the renderer-as-projection rule from [Architecture](./ARCHITECTURE.md).

```
+--------------------------------------------------+
|  main  ↑2 ↓0            [ Fetch ]  [ Branch ▾ ]   |  <- branch bar
+--------------------------------------------------+
|  Commit message                                  |
|  [ ......................................... ]    |  <- message box
|  [ Commit ]  [ Amend ]   [x] sign off            |
+--------------------------------------------------+
|  Staged (2)                          [ Unstage ▾]|
|   M  src/app.tsx           +14 -3   [v] inline    |
|       @@ -12,7 +12,9 @@                           |
|       + const ready = useReady();                 |
|   A  src/new.ts            +40 -0                  |
+--------------------------------------------------+
|  Changes (3)                           [ Stage ▾]|
|   M  packages/git/store.ts +6  -1   ( stage )     |
|   ?  scratch.md             new     ( stage )     |
|  !!  README.md            conflict  ( resolve )   |
+--------------------------------------------------+
|  History                                          |
|   a1b2c3  feat: add git panel        2h           |
|   d4e5f6  fix: diff offsets          5h           |
+--------------------------------------------------+
```

Interaction rules:

- Clicking a file row toggles its **inline diff**. A "full diff" button opens the Monaco diff editor.
- Stage and unstage act on the selected rows (multi-select supported). A row-level stage control acts on that single file.
- The branch dropdown lists branches with ahead/behind, offers "Create branch", and switches on selection (with the dirty-tree guard from section 9).
- Conflicted files show a "resolve" action that opens the merge editor; they cannot be staged until resolved.
- Every destructive action (discard, hard reset, amend published, delete branch) opens the confirmation dialog from section 13. There is no destructive action wired to a bare click.
- Loading and empty states follow the product rule: a clean repo shows a cozy "Working tree clean" empty state, never a blank panel; in-flight reads show a skeleton, not a spinner over stale data.

## 12. git_action AgentEvents and Pixie celebrations

When the agent runs Git inside its own process, its adapter (see [Providers Spec](./PROVIDERS_SPEC.md)) emits a `git_action` [AgentEvent](./AGENT_EVENT_SCHEMA.md). vsclaude reacts in two ways: it refreshes the Git panel, and it tells Pixie to celebrate.

The event carries a structured payload so both the panel and the mascot can act without re-parsing free text:

```ts
// payload shape for type: 'git_action'
interface GitActionPayload {
  action: 'commit' | 'branch_create' | 'checkout' | 'merge'
        | 'push' | 'pull' | 'fetch' | 'tag' | 'stash' | 'rebase' | 'other';
  ref?: string;          // branch or tag name involved
  sha?: string;          // resulting commit sha when known
  summary?: string;      // commit subject, for the caption
  filesChanged?: number;
}
```

The bridge in `packages/git/src/celebrate.ts` maps the action to a Pixie git directive. Pixie's `git` state (defined in the [Mascot System](./MASCOT_SYSTEM.md)) plays, and the action picks the mood and a celebratory accent:

| `action` | Pixie state | Mood | Caption template |
| --- | --- | --- | --- |
| `commit` | `git` then `success` | excited | "Committed: {summary}" |
| `branch_create` | `git` | focused | "Created branch {ref}" |
| `checkout` | `git` | calm | "Switched to {ref}" |
| `merge` | `git` then `success` | excited | "Merged {ref}" |
| `push` | `git` | excited | "Pushed to {ref}" |
| `pull` / `fetch` | `git` | calm | "Synced with remote" |
| `rebase` | `git` | focused | "Rebased onto {ref}" |
| `stash` | `git` | calm | "Stashed changes" |
| `tag` | `git` | focused | "Tagged {ref}" |

Rules that keep this truthful:

- **The celebration is bound to the real event.** Pixie only plays the git state because a `git_action` event actually arrived from the agent's stream. The IDE never fakes a commit animation.
- **Meaning is recoverable.** The directive carries `sourceEventId`. Clicking Pixie or the caption opens the event detail with the exact command, sha, and raw output.
- A `commit` or `merge` action chains into Pixie's `success` state for a short, satisfying beat (a small confetti Lottie accent is allowed here, per the Lottie "tiny accents only" rule in the tech stack). The accent is debounced so a rapid burst of commits produces one celebration, not a strobe.
- After any `git_action`, the renderer issues a `git_status` re-read so the panel reflects the agent's commit immediately. This is the same re-read invariant, just triggered by an event instead of a user action.

```ts
// celebrate.ts (sketch)
export function gitActionToDirective(ev: AgentEvent): MotionDirective {
  const p = ev.payload as GitActionPayload;
  const table = GIT_CELEBRATIONS[p.action] ?? GIT_CELEBRATIONS.other;
  return {
    state: 'git',
    mood: table.mood,
    caption: ev.caption ?? renderCaption(table.caption, p),
    chainTo: table.chainSuccess ? 'success' : undefined,
    sourceEventId: ev.id,
  };
}
```

## 13. Safety around destructive operations

A destructive operation is any operation that can lose committed or uncommitted work, or that rewrites history. The set is fixed and classified in `safety.rs`.

```rust
pub enum DestructiveOp {
    DiscardWorktree,   // throw away uncommitted changes to tracked files
    DeleteUntracked,   // remove untracked files (clean)
    HardReset,         // move HEAD and reset index + worktree
    AmendPublished,    // rewrite a commit that exists upstream
    ForceDeleteBranch, // delete a branch with unmerged commits
    ForcePush,         // overwrite remote history (never auto-offered)
}
```

The protection model has four layers:

1. **Typed confirmation tokens.** Destructive IPC commands require a `ConfirmToken` that names the exact operation and the exact targets. The token is minted by the renderer only after the user confirms in the dialog, and it is single-use and time-bounded.

   ```rust
   pub struct ConfirmToken {
       pub op: DestructiveOp,
       pub targets: Vec<String>, // paths or refs this token authorizes
       pub nonce: String,        // single-use
       pub issued_at: u64,
   }
   ```

   The Rust handler verifies that the token's `op` and `targets` match the request exactly. A token for discarding `a.ts` cannot be replayed to discard `b.ts`, and a token for `DiscardWorktree` cannot authorize a `HardReset`.

2. **Mandatory backup before loss.** Before any operation that discards uncommitted changes (`DiscardWorktree`, `HardReset`), the core writes the affected blobs to a Git **stash or a reflog-visible safety ref** so the change is recoverable. The reflog is never disabled. The confirmation dialog tells the user exactly how to recover (`git stash list`, or the safety ref name).

3. **Force push is never automatic.** vsclaude does not offer force push as a one-click action anywhere in the UI. `ForcePush` exists in the enum only so the safety layer can reject it from the normal flow. If force push is ever added, it is behind an explicit advanced toggle plus a typed token, and it is never reachable from a `git_action` event handler.

4. **Clear, specific confirmation copy.** The dialog states what will be lost, in plain language, with counts and a recovery path. It never says "Are you sure?" alone. Example: "Discard changes to 3 files? This removes 142 uncommitted lines. A backup is saved to stash entry stash@{0}; recover with git stash pop."

The confirmation dialog component:

```ts
export interface DestructiveConfirm {
  op: DestructiveOp;
  targets: string[];
  summary: string;         // human sentence with counts
  recovery: string;        // exact recovery instruction
  requiresType?: string;   // for the worst ops, user types a phrase to enable
}
```

For the two highest-risk operations (`HardReset` to a different commit, `ForceDeleteBranch`), the dialog requires the user to type a short confirmation phrase (`requiresType`) before the confirm button enables, the way GitHub gates repository deletion.

Agent-driven Git never triggers destructive vsclaude flows. If the **agent** itself runs `git reset --hard`, that is the agent's own process acting under its own permissions; vsclaude observes the resulting `git_action` event and refreshes, but vsclaude's own destructive commands are reachable only by the human through the gated UI.

## 14. Live updates and watching

The Git panel stays fresh through two channels, both feeding the same `git_status` re-read:

- **Filesystem watch.** The `notify`-based watcher described in [Architecture](./ARCHITECTURE.md) watches the workspace and the `.git` directory (specifically `.git/HEAD`, `.git/index`, and `.git/refs`). Changes are debounced (250 ms) and coalesced into a single status refresh, so a build that touches a thousand files yields one re-read, not a thousand.
- **AgentEvent trigger.** A `git_action`, `file_edit`, `file_create`, or `file_delete` event prompts a status refresh, so the panel tracks the agent's edits as they happen.

The status store keeps a short generation counter; a refresh that started before a newer one is discarded on arrival so out-of-order async responses cannot show stale state. This is the same monotonic-generation guard used elsewhere in the renderer.

## 15. Error model

Every Git command returns a discriminated `GitError` so the UI can react precisely instead of showing a raw string.

```ts
export type GitError =
  | { kind: 'not_a_repo' }
  | { kind: 'missing_identity' }
  | { kind: 'would_overwrite'; paths: string[] }
  | { kind: 'conflict'; paths: string[] }
  | { kind: 'invalid_branch_name'; name: string }
  | { kind: 'invalid_token' }                 // bad/expired confirmation token
  | { kind: 'in_progress'; operation: string } // merge/rebase blocks the action
  | { kind: 'hook_failed'; output: string }    // pre-commit/commit-msg rejected
  | { kind: 'auth_failed' }                    // fetch/push credential failure
  | { kind: 'io'; message: string }
  | { kind: 'unknown'; message: string };
```

UI handling rules:

- `missing_identity` opens an inline identity form, never a generic error toast.
- `would_overwrite` and `conflict` list the exact paths and offer concrete next actions (stash, commit, resolve).
- `hook_failed` shows the hook output verbatim in a detail drawer, since the user's own hook is talking to them.
- `auth_failed` routes to credential help and never logs the credential.

## 16. Test matrix

Git is high-risk, so coverage is broad. Tests run against ephemeral repositories created in a temp dir by a fixture builder, never against the developer's real repo.

| Area | Test | Type |
| --- | --- | --- |
| Status | clean repo reports `clean: true` | Rust unit |
| Status | staged + worktree change appears in both buckets | Rust unit |
| Status | rename detection sets `origPath` | Rust unit |
| Status | detached HEAD sets `detachedHead`, `branch: null` | Rust unit |
| Diff | binary file yields `binary: true`, no hunks | Rust unit |
| Diff | hunk ids are stable across re-reads | Rust unit |
| Stage | stage then unstage returns to original status | Rust unit |
| Stage hunk | staging one of three hunks stages exactly those lines | golden file |
| Commit | empty message rejected unless `allowEmpty` | Rust unit |
| Commit | missing identity returns `missing_identity` | Rust unit |
| Commit | repo with pre-commit hook routes to shell engine | Rust integration |
| Amend | amending a pushed HEAD requires a token | Rust unit |
| Branch | invalid name rejected before any mutation | Rust unit |
| Switch | dirty conflicting switch returns `would_overwrite`, no data lost | Rust unit |
| Safety | discard writes a recoverable stash before deleting | Rust unit |
| Safety | a token for op A cannot authorize op B | Rust unit |
| Safety | a token for path X cannot discard path Y | Rust unit |
| Celebrate | `git_action` commit produces a `git` then `success` directive | TS unit |
| Celebrate | rapid commits debounce to one celebration | TS unit |
| Contract | Rust `GitStatus` fixture parses against TS Zod schema | contract |
| E2e | stage, write message, commit, see history update | Playwright |
| E2e | destructive discard requires typed confirmation | Playwright |

The stage-hunk golden tests are mandatory and run on a fixture with adjacent hunks and trailing-newline edge cases, the two scenarios that most often break index patching.

## 17. Invariants and non-goals

**Invariants** (must always hold):

- The renderer never touches `.git`, never shells out, and never imports a JS Git library. All Git work crosses the typed IPC boundary into the Rust core.
- Every mutating Git command re-reads and returns fresh status. There is no long-lived optimistic index model in the renderer.
- No destructive operation runs without a matching single-use `ConfirmToken`.
- Operations that discard uncommitted work always leave a recoverable backup (stash or safety ref) and the reflog is never disabled.
- Force push is never one click and never reachable from a `git_action` handler.
- A Pixie git celebration plays only because a real `git_action` event arrived, and the directive always carries `sourceEventId` so the underlying command is recoverable.
- Paths are normalized to forward slashes at the Rust boundary so renderer keys are stable across platforms.

**Non-goals** (explicitly out of scope for this module):

- A full graphical merge tool beyond opening conflicted files in the editor with conflict markers. The merge editor is its own spec.
- Submodule management UI. Submodules are read in status but not driven from this panel in the first version.
- Interactive rebase UI. Rebase is observed (status `operation`) and can be continued or aborted through the shell allow-list, but the IDE does not provide an interactive todo editor yet.
- Hosting-provider integration (pull requests, reviews). That belongs to a separate remote-collaboration spec.

Together these rules make the Git subsystem truthful by construction: what the panel shows is always read fresh from the real repository, every celebration is bound to a real `git_action` event, every detail is one click from its raw command, and nothing that can lose work happens without an explicit, recoverable, typed confirmation.
