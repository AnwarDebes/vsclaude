# Workspace and Files Spec (Phase A1)

This document is the normative contract for the workspace and real filesystem layer
of vsclaude: opening a project folder, the recent-projects list, the live file tree
backed by the Rust core, the full set of file operations (create, rename, delete,
move, duplicate), saving to disk with dirty tracking and conflict detection, and
external-change detection through a filesystem watcher. It is the foundation that
turns the demo shell into a daily-driver editor. Everything here is built against
the frozen [`@vsclaude/contracts`](../packages/contracts/src/ipc.ts) IPC surface.

This spec is the pragmatic, shippable subset of the broader [Editor Spec](./EDITOR_SPEC.md).
Where the Editor Spec calls for `rootId`-namespaced URIs, per-document etags, and a
dockview layout tree, A1 deliberately uses plain absolute paths and a modification
time (`mtimeMs`) as a lightweight conflict guard. Those richer abstractions are a
later migration tracked in the Editor Spec; nothing here blocks them.

## Table of contents

- [1. Goals and non-goals](#1-goals-and-non-goals)
- [2. IPC surface (contract v2)](#2-ipc-surface-contract-v2)
- [3. The Rust filesystem core](#3-the-rust-filesystem-core)
- [4. The workspace model](#4-the-workspace-model)
- [5. The file tree (lazy)](#5-the-file-tree-lazy)
- [6. File operations](#6-file-operations)
- [7. The editor: tabs, dirty state, save, conflicts](#7-the-editor-tabs-dirty-state-save-conflicts)
- [8. External-change detection](#8-external-change-detection)
- [9. Recent projects and persistence](#9-recent-projects-and-persistence)
- [10. Path normalization](#10-path-normalization)
- [11. Accessibility](#11-accessibility)
- [12. Acceptance criteria](#12-acceptance-criteria)
- [13. Validation checklist](#13-validation-checklist)

## 1. Goals and non-goals

**Goals**

- Open any folder on disk as a project, with a recent-projects list and multi-root
  support (more than one folder open at once).
- A live file tree that reads real directory contents lazily (one read per expanded
  folder), backed by the Rust core, not a static demo list.
- Full file operations from the explorer: new file, new folder, rename, delete (to
  the OS recycle bin so it is recoverable), duplicate, move (drag and drop), copy
  path, and reveal in the OS file manager.
- Monaco reads and writes real files. Open files become tabs with dirty indicators.
  Saving writes to disk. An optional auto-save mode.
- External-change detection: when a file changes on disk outside the editor, an open
  unmodified buffer reloads, and a modified buffer prompts the user. The tree
  refreshes when its directories change on disk.

**Non-goals (deferred, tracked in the Editor Spec)**

- URI/`rootId` namespacing and per-document etags (A1 uses absolute paths + mtime).
- The dockview split/dock layout, preview tabs, and persisted layout tree.
- The agent-edit review queue and hunk-level diff pipeline (the existing DiffReview
  overlay remains; the review pipeline is a later increment).
- Language intelligence (LSP) and project-wide search live in their own specs (A2,
  A3).

## 2. IPC surface (contract v2)

A1 bumps `IPC_PROTOCOL_VERSION` from 1 to 2 (mirrored in the Rust core). The added
and changed commands:

```ts
// New
'fs.stat':       { args: { path: string }; result: FileStat };
'fs.createFile': { args: { path: string; content?: string }; result: void };
'fs.createDir':  { args: { path: string }; result: void };
'fs.rename':     { args: { from: string; to: string }; result: void };
'fs.delete':     { args: { path: string }; result: void };          // to recycle bin
'fs.copy':       { args: { from: string; to: string }; result: void };

// Changed: both now carry mtimeMs for conflict detection
'fs.readFile':   { args: { path: string }; result: { content: string; encoding: 'utf-8'; mtimeMs: number } };
'fs.writeFile':  { args: { path: string; content: string }; result: { mtimeMs: number } };

// Already declared in v1, now implemented in the Rust core
'fs.watch':      { args: { path: string }; result: { watchId: string } };
'fs.unwatch':    { args: { watchId: string }; result: void };
```

```ts
interface FileStat {
  path: string;
  name: string;
  kind: 'file' | 'directory' | 'symlink';
  exists: boolean;
  size?: number;
  mtimeMs?: number;
}
```

The `fs:changed` event (already declared) is now emitted by the watcher:

```ts
'fs:changed': { watchId: string; path: string; kind: 'created' | 'modified' | 'deleted' };
```

All command names follow the existing dotted-to-snake translation (`fs.createDir`
becomes `fs_create_dir`).

## 3. The Rust filesystem core

The Rust core owns all filesystem access. New behavior:

- Every returned path is normalized to forward slashes (see [section 10](#10-path-normalization)).
  `std::fs` on Windows accepts forward slashes, so the same normalized string is
  used both as the renderer key and when calling back into the core.
- `fs.delete` uses the `trash` crate (OS recycle bin) so deletes are recoverable,
  honoring the repository safety rule that destructive actions are reversible.
- `fs.copy` copies files with `std::fs::copy` and directories recursively.
- `fs.createFile` fails if the target already exists (no silent clobber) and creates
  missing parent directories.
- `fs.rename` covers both rename and move; it creates the destination parent if
  needed and refuses to move a directory into itself or a descendant.
- `fs.readFile`/`fs.writeFile` return the file modification time in epoch
  milliseconds. The renderer remembers it and re-checks before overwriting.
- The watcher uses `notify` with a debouncer (about 150 ms). One watcher per
  `fs.watch` call, tracked by `watchId` in app state, dropped on `fs.unwatch`.
  Events coalesce and emit as `fs:changed` with a normalized path.

Open-folder uses `tauri-plugin-dialog` (`open({ directory: true })`) so the user
picks a real folder through the native dialog. Only the open permission is
granted (`dialog:allow-open`), not the full dialog default.

### Security posture

The `fs.*` commands accept absolute paths and are not confined to a workspace
root. This is deliberate: like VS Code and Cursor, vsclaude is a user-operated
editor that legitimately needs to open and edit files anywhere the user points
it. The important boundary is that these commands are driven only by the human
through the explorer and editor; the agent never reaches the filesystem through
them. The agent's file access flows through its own process (the PTY and provider
channels) under the separate permission model in `PERMISSIONS_AND_SAFETY.md`, so
this command surface does not widen the agent's reach. Deletes go to the recycle
bin (recoverable), creates are atomic and refuse to clobber, and renames refuse
to move a path into itself or a descendant. Workspace-root confinement and write
size caps are tracked as future hardening if the threat model changes.

## 4. The workspace model

A workspace is one or more open root folders. The renderer owns a `useWorkspace`
hook exposing:

- `roots: WorkspaceRoot[]` where `WorkspaceRoot = { id, path, name }`.
- `openFolder()` (opens the native dialog, adds a root), `openPath(path)`,
  `closeRoot(id)`, `closeAll()`.
- `recents: RecentProject[]` (persisted, most-recent first, de-duplicated, capped).
- The lazy tree state and the file operations (section 6).

When no root is open the app shows the welcome/demo experience (the soul still
runs); when at least one root is open the explorer and editor operate on real files.

## 5. The file tree (lazy)

The tree reuses the existing pure model in `@vsclaude/editor` (`buildFileTree`,
`flattenVisible`, `toggleExpanded`). Lazy loading is layered on top:

- The renderer keeps a flat `Map<path, FsEntry>` of every entry it has loaded and a
  `Set<path>` of directories whose children have been fetched (`loadedDirs`).
- Expanding a directory not in `loadedDirs` calls `fs.readDir`, merges the children
  into the entry map, marks it loaded, then rebuilds the tree from the flat list.
- Directories always render an expand affordance; an empty directory simply reveals
  nothing. Each root is a top-level node.
- Noise directories (`.git`, `node_modules`, `target`, `dist`, `.vsclaude`) are
  de-emphasized but still listed; a future increment adds gitignore-aware filtering.

A new pure helper module in `@vsclaude/editor` provides the lazy-accumulation and
reconciliation logic so it is unit-testable without React.

## 6. File operations

From the explorer (context menu and keyboard):

| Action | Command | Notes |
| --- | --- | --- |
| New File | `fs.createFile` | inline name input, opens the file after creation |
| New Folder | `fs.createDir` | inline name input |
| Rename | `fs.rename` | inline edit; updates open tabs for the path |
| Delete | `fs.delete` | to recycle bin; closes affected tabs |
| Duplicate | `fs.copy` | derives a non-colliding `name copy.ext` |
| Move | `fs.rename` | drag a node onto a folder; refuses self/descendant |
| Copy Path | clipboard | normalized absolute path |
| Reveal in OS | dialog/opener | best effort |

After any mutation the affected directory is re-read and the tree reconciled. A
pure `validateMove(from, to)` helper guards against moving into self or a descendant.

## 7. The editor: tabs, dirty state, save, conflicts

- Open files become tabs managed by the existing `TabManager`. A tab bar renders
  open tabs with a dirty dot and a close button; the active tab shows in Monaco.
- Selecting a file in the explorer opens (or activates) its tab and loads content
  through `fs.readFile`, caching `{ content, mtimeMs }` per path.
- Editing marks the tab dirty (current text differs from the last-saved text).
- Save (Ctrl or Cmd plus S) writes through `fs.writeFile`; on success the cached
  text and `mtimeMs` update and the tab is clean. Save All saves every dirty tab.
- Conflict guard: before writing, if the on-disk `mtimeMs` (from `fs.stat`) is newer
  than the cached one, the user is asked to overwrite or reload.
- Auto-save: an opt-in setting writes dirty buffers after a short debounce.

## 8. External-change detection

- Each open root is watched (`fs.watch` on the root path). `fs:changed` events drive
  two reconcilers (both pure and tested):
  - Tree: a changed/created/deleted path under a loaded directory triggers a re-read
    of that directory.
  - Buffers: a `modified` event for an open file reloads it when the tab is clean;
    when the tab is dirty it raises a non-destructive banner offering Reload or Keep
    Mine. A `deleted` event marks the tab as orphaned.

## 9. Recent projects and persistence

- Recents persist to `localStorage` under `vsclaude.workspace.recents` as an ordered
  list of `{ path, name, lastOpenedMs }`, de-duplicated by path, capped at 12.
- The open roots persist under `vsclaude.workspace.roots` so a relaunch can restore
  the last session (best effort; missing folders are skipped).
- A pure `recents` model (add, touch, cap, serialize, parse) lives in
  `@vsclaude/editor` with unit tests.

## 10. Path normalization

All renderer-facing paths use forward slashes. The Rust core normalizes every path
it returns (directory listings, stat, watch events) and accepts forward-slash paths
on the way back in. This gives stable keys across the tree, the watcher, and the
editor on Windows and POSIX alike. The existing tree splitter already tolerates both
separators, so display names and parent synthesis are unaffected.

## 11. Accessibility

- The explorer is a keyboard-navigable tree (`role="tree"`, arrow keys to move,
  Enter to open, F2 to rename, Delete to delete) with `aria-expanded` on folders.
- The tab bar is keyboard operable; the active tab is announced.
- The external-change banner is an `aria-live` polite region.
- All new interactive controls have accessible names; reduced-motion is respected.

## 12. Acceptance criteria

Each criterion is individually testable.

1. The command palette offers Open Folder, which opens a native dialog and adds the
   chosen folder as a root.
2. The explorer shows the real top-level contents of an open root, sorted with
   directories first.
3. Expanding a directory lazily reads and shows its real children; collapsing hides
   them; re-expanding does not re-fetch.
4. Opening a file loads its real content into Monaco; the path becomes a tab.
5. Editing marks the tab dirty (a visible dot); saving writes the change to disk and
   clears the dirty state; reopening the file shows the saved content.
6. New File, New Folder, Rename, Duplicate, and Delete each perform the real
   operation on disk and the tree reflects it without a manual refresh.
7. Delete moves the target to the OS recycle bin (recoverable), not a hard delete.
8. Moving a node onto a folder (drag and drop) relocates it on disk; moving a folder
   into itself or a descendant is refused.
9. Changing an open, unmodified file on disk reloads the buffer automatically;
   changing a dirty file raises the Reload / Keep Mine banner.
10. Recent projects persist across reloads and reopen with one action.
11. With no folder open the welcome/demo experience still runs (the soul is intact).
12. All new pure logic (recents, lazy-tree accumulation, change reconciliation,
    move validation, duplicate-name derivation) has unit tests.

## 13. Validation checklist

- [ ] `IPC_PROTOCOL_VERSION` is 2 in contracts and mirrored in the Rust core.
- [ ] Every new `fs.*` command is implemented in Rust, registered in `lib.rs`, and
      typed in the contract, with names in lockstep.
- [ ] `cargo check` is clean with no warnings.
- [ ] `pnpm build:packages`, `pnpm -r typecheck`, `pnpm test`, and `pnpm lint` are
      all green.
- [ ] New unit tests cover the pure workspace logic.
- [ ] A Playwright path covers opening a file and editing in the renderer demo.
- [ ] No em dashes anywhere in the added code, comments, or docs.
- [ ] `PROGRESS.md` and `ROADMAP.md` updated.
</content>
</invoke>
