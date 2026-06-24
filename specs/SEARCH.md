# Project-wide search

Status: building. This spec covers the find half of catalog section 5.8 (Search
and replace across files). Replace across files is an explicit follow-up.

## Goal

Give vsclaude the project-wide search VS Code users reach for constantly: a query
box with regex, case, and whole-word toggles, include and exclude globs, gitignore
awareness, and a results tree where every match opens its file at the line. The
engine runs in the Rust core, built on the same libraries ripgrep is (the `ignore`
and `grep` crates), so it is fast, gitignore-aware, and self-contained, with no
runtime dependency on an external binary.

## Scope

In scope for this slice:

- A `search.find` IPC command (protocol v5) backed by the Rust core: walks the
  root with `ignore` (respecting .gitignore and the include and exclude globs),
  searches each text file with a `grep` regex matcher, and returns matches with
  line numbers, the line text, and the match ranges. The result is capped so a
  huge repository cannot hang the UI.
- A Search panel docked in the bottom drawer: a query box (debounced), regex,
  case, and whole-word toggle buttons, optional files-to-include and
  files-to-exclude inputs, and a results tree grouped by file. Each match
  highlights the hit in the line and opens the file at the line and column when
  clicked. A summary line reports the match and file counts and whether the result
  was truncated.
- The bottom drawer becomes a single slot that shows Problems or Search (not both
  at once), toggled by their commands and shortcuts (Ctrl or Cmd plus Shift plus M
  for Problems, Ctrl or Cmd plus Shift plus F for Search).
- Pure view-model helpers (split a line by its match ranges for highlighting, and
  summarize a result), unit tested.
- A Rust unit test for the search engine over a temporary directory.

Explicit non-goals for this slice (tracked elsewhere in the matrix):

- Replace across files with per-match preview and apply-all. The result model
  carries the ranges replace needs, but the replace UI and the write path are a
  follow-up.
- A persistent Search Editor, search history, and search-in-selection.
- A binary-file or huge-file search mode beyond skipping them.

## Contracts

`search.find` is added to `IpcCommandMap` and the protocol goes from 4 to 5, with
the Rust `const IPC_PROTOCOL_VERSION` in lockstep.

```
interface SearchOptions {
  regex?: boolean;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  includeGlobs?: string[];
  excludeGlobs?: string[];
  maxResults?: number;
}
interface SearchRange { start: number; end: number }            // code-point offsets in the line
interface SearchLineMatch { line: number; text: string; ranges: SearchRange[] }
interface SearchFileResult { path: string; lines: SearchLineMatch[] }
interface SearchResult { files: SearchFileResult[]; matchCount: number; truncated: boolean }

'search.find': { args: { root: string; query: string; options?: SearchOptions }; result: SearchResult }
```

- Default options: not regex (the query is matched literally), case insensitive,
  not whole word, gitignore respected, hidden files skipped, capped at 5000
  matches (hard ceiling 50000).
- `ranges` are code-point offsets within `text` so the renderer can split the line
  with `[...text]` and highlight correctly past ASCII.
- A non-text or unreadable file is skipped, never an error.

## Acceptance criteria

1. `search.find` returns the matches for a literal query across the root, omits
   gitignored and excluded paths, honors include globs as a whitelist, sets
   `truncated` at the cap, and reports the right `matchCount`. An empty query
   returns no matches and does not error. A Rust test covers this on a temp dir.
2. The Search panel runs a debounced query and shows results grouped by file, each
   line with the match highlighted, each row opening the file at the line.
3. The regex, case, and whole-word toggles change the results and are accessible
   (real buttons with aria-pressed). Include and exclude globs filter the result.
4. Ctrl or Cmd plus Shift plus F opens the Search panel; Ctrl or Cmd plus Shift
   plus M opens Problems; opening one closes the other (one bottom slot).
5. With no workspace open (the browser demo), the panel shows a clear note to open
   a folder rather than failing.
6. `splitLineByRanges` splits a line into matched and unmatched segments by code
   point, covering adjacent and out-of-order ranges. `summarizeSearch` reports the
   file and match counts.
7. Build, typecheck, lint, unit tests, the Playwright suite, and `cargo check` (and
   the new cargo test) are green, and the matrix rows for 5.8 are updated.

## Validation checklist

- Unit (TS): `splitLineByRanges` and `summarizeSearch`.
- Unit (Rust): `run_search` over a temp directory with a gitignored file, an
  excluded glob, and a literal and a regex query.
- End to end: a Playwright test opens the Search panel and asserts the query box
  and (in the demo) the open-a-folder note; Problems and Search do not show at once.
