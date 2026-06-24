# Quick Open and the quick-pick framework

Status: building. This spec covers catalog section 5.6 (Quick open and command
palette) and the reusable quick-pick framework that later features build on.

## Goal

Give vsclaude the iconic VS Code keyboard-first navigation: a Ctrl or Cmd plus P
file picker, a command mode, and a go-to-line jump, all through one palette that
routes on a prefix. Underneath, ship a small reusable quick-pick framework so the
later branch picker (5.9), terminal profile picker (5.10), theme picker (5.16),
and project search (5.8) all reuse the same ranked, accessible list instead of
each inventing its own.

## Scope

In scope for this slice:

- A pure quick-pick model in `@vsclaude/core-shell`: a `QuickPickItem` shape, a
  `filterQuickPick` ranker that reuses the existing subsequence scorer, and a
  `parsePaletteInput` prefix router.
- A recursive file index from the Rust core: a new `fs.walk` IPC command that
  returns the file paths under a folder, skipping heavy or noise directories and
  capping the result so a huge tree never hangs the picker. This bumps the IPC
  protocol to version 4.
- A unified palette in the desktop app that opens on Ctrl or Cmd plus K in command
  mode and Ctrl or Cmd plus P in file mode, and routes live on the typed prefix:
  `>` for commands, `:` for go to line and column, and no prefix for the mode it
  was opened in.
- Keybinding display: commands may carry a `keybinding` label that the palette
  renders right-aligned, the way VS Code shows shortcuts in the palette.
- A small editor bridge that tracks the active Monaco editor so go-to-line can
  jump the current file. This same bridge carries the editor command surface in
  the next slice.

Explicit non-goals for this slice (tracked elsewhere in the matrix):

- `@` document symbols and `#` workspace symbols. These need symbol providers,
  which arrive with the code-intelligence slice (5.2). The router reserves the
  prefixes but does not claim the feature.
- Command categories and grouping headers.
- Go to definition and the back and forward navigation stack (5.2).
- Respecting `.gitignore` in the file walk. The walk uses a fixed ignore set for
  now; gitignore-aware walking arrives with project search (5.8).

## Contracts

`fs.walk` is added to `IpcCommandMap`:

```
'fs.walk': { args: { path: string; limit?: number }; result: { files: string[]; truncated: boolean } }
```

- `path`: the folder to walk. `limit`: optional cap on the number of files
  (default 20000, hard ceiling 100000).
- `files`: file paths under `path`, recursive, forward-slash normalized, with
  directories named `node_modules`, `.git`, `target`, `dist`, `build`, `.next`,
  `out`, `coverage`, `.turbo`, `.cache`, `.svn`, `.hg`, and `vendor` skipped.
  Symlinks are not followed, so the walk cannot loop.
- `truncated`: true when the cap stopped the walk before the tree was exhausted.

`IPC_PROTOCOL_VERSION` goes from 3 to 4. The Rust `const IPC_PROTOCOL_VERSION`
in `lib.rs` moves in lockstep, and `fs_walk` is registered in the invoke handler.

`Command` in `@vsclaude/core-shell` gains an optional `keybinding?: string`. It is
a display label only; it does not register a real key handler.

## Acceptance criteria

1. `filterQuickPick('', items)` returns the items in their original order, capped
   at the limit. A non-empty query returns only items whose label, description, or
   keywords match as a subsequence, best first.
2. `parsePaletteInput` routes `>` to commands, `:12` to go-to-line 12, `:12:5` to
   line 12 column 5, and anything else to the base mode it is given. Whitespace is
   trimmed. A bare `:` with no number yields go-to mode with no line, which the
   palette treats as a no-op until a number is typed.
3. `fs.walk` on a folder returns its files recursively, omits the ignored
   directories, normalizes paths to forward slashes, and sets `truncated` when the
   cap is hit. It never follows a symlink and never errors on an unreadable
   subdirectory (it skips it).
4. Ctrl or Cmd plus P opens the palette in file mode with the file index loaded
   for the open workspace, or the demo files when no workspace is open. Typing
   filters; Enter opens the highlighted file in the editor.
5. Ctrl or Cmd plus K still opens command mode with the existing label and
   placeholder, so the current palette flow and its end-to-end test keep passing.
   Typing `>` in file mode switches to commands, and `:` switches to go-to-line.
6. With a file open, choosing `:40` reveals and selects line 40 in the active
   editor and focuses it.
7. The palette has accessible combobox and listbox semantics: the input is a
   combobox that controls the listbox, the active row is referenced by
   `aria-activedescendant`, and each row is an option with `aria-selected`.
8. A command that carries a `keybinding` shows it right-aligned in the palette.
9. Build, typecheck, lint, unit tests, the Playwright suite, and `cargo check`
   are all green, and the feature matrix row for 5.6 is updated.

## Validation checklist

- Unit: `filterQuickPick` ranking and empty-query passthrough; `parsePaletteInput`
  for every prefix and the column form; the editor bridge go-to-line against a
  fake editor.
- End to end: a Playwright test opens Ctrl or Cmd plus P, filters to a file, and
  opens it; the existing command-palette and diff-review tests still pass.
- Manual or native: `cargo check` clean; `fs.walk` returns a sane file list on a
  real folder with `node_modules` present and excluded.
