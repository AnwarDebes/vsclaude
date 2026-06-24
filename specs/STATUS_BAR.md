# Workbench status bar

Status: building. This spec covers the status bar slice of catalog section 5.5
(Workbench layout and navigation), and the reusable status-bar-item model that
later features contribute to.

## Goal

Give vsclaude the always-present bottom strip VS Code users read without thinking:
the current branch and change count on the left, and the language, end-of-line,
indentation, cursor position, and selection on the right. Underneath, ship a small
reusable status-bar-item model so later features (a problems count, a search
indicator, a task or debug state) contribute items instead of each hand-rolling a
corner of the bar.

## Scope

In scope for this slice:

- A pure status-bar model in `@vsclaude/core-shell`: a `StatusBarItem` shape (id,
  text, side, priority, optional tooltip, ariaLabel, and command id) and an
  `orderStatusItems` helper that filters by side and sorts by priority. Reusable
  and unit tested.
- An extension to the editor bridge: alongside the active editor it now publishes
  a small `EditorStatus` snapshot (line, column, selected character count,
  language id, end-of-line, and indentation) with a subscribe API, so the bar can
  render live editor state without reaching into Monaco.
- A `useEditorStatus` hook over that store, and a `useGitStatus` hook that reads
  the branch and change count through the existing `gitStatus` plus
  `parsePorcelainStatus` path (native only; quiet and absent in the browser demo).
- A `StatusBar` component, data driven from the item list, with left and right
  groups. Items with a command run it on click. It is wired into the app shell as
  a new bottom row, present in every presentation mode.
- Two items are interactive in this slice: the cursor position opens the go-to
  line palette (`:`), and the branch opens the review-and-commit overlay. The rest
  are read-only displays.

Explicit non-goals for this slice (tracked elsewhere in the matrix):

- An encoding picker, an end-of-line switcher, an indentation converter, or a
  language-mode picker. The bar shows these values now; making them clickable
  pickers is the settings and language-mode work (5.14, 5.2).
- A problems count (needs the diagnostics surface, 5.2 and 5.5) and any
  task or debug status (5.11, 5.12). The model reserves room for them.
- Plugin-contributed status items end to end (5.17). The model is plugin ready,
  but no extension host wiring is part of this slice.

## Contracts

No IPC change. `StatusBarItem` and `orderStatusItems` are added to
`@vsclaude/core-shell` and exported from its barrel. `EditorStatus` and the
status store are added to the desktop app's editor bridge.

```
interface StatusBarItem {
  id: string;
  text: string;
  side: 'left' | 'right';
  priority?: number;     // within a side, higher sorts first
  tooltip?: string;
  ariaLabel?: string;
  command?: string;      // a command id run on click
}
```

## Acceptance criteria

1. `orderStatusItems(items, 'left')` returns only left items, sorted by priority
   descending with the id as a stable tie breaker, and likewise for the right.
2. The editor bridge publishes an `EditorStatus` when an editor mounts and updates
   it on cursor move, selection change, and content or model change. Subscribers
   are notified; the snapshot clears when the editor unmounts.
3. The status bar is visible in every presentation mode and shows, on the right,
   the language label, the end-of-line (LF or CRLF), the indentation (Spaces or
   Tab Size with the width), the cursor position as "Ln L, Col C", and a selection
   count when a selection is non-empty.
4. With a real workspace open in the native app, the left side shows the branch
   name and the count of changed files; clicking it opens the review overlay. In
   the browser demo the git item is absent rather than broken.
5. Clicking the cursor-position item opens the palette in go-to-line mode.
6. The bar is accessible: a labeled group, each interactive item a real button
   with an aria-label, each static item a span with an aria-label, and no live
   region (so cursor moves are not announced on every keystroke).
7. Build, typecheck, lint, unit tests, the Playwright suite, and `cargo check`
   are all green, and the feature matrix row for 5.5 is updated.

## Validation checklist

- Unit: `orderStatusItems` ordering and side filtering; the editor bridge status
  store publish, subscribe, and clear.
- End to end: a Playwright test opens a file and asserts the status bar shows the
  cursor position and the language; clicking the cursor item opens the go-to-line
  palette.
