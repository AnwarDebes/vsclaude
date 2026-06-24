# Problems panel and diagnostics

Status: building. This spec covers the diagnostics surface that catalog 5.2 (Code
intelligence) and 5.5 (Workbench layout) share: a normalized diagnostics model, a
Problems panel, and the error and warning counts in the status bar.

## Goal

Surface the squiggles the editor already computes. Monaco's bundled language
workers (TypeScript, JavaScript, JSON, CSS, HTML) produce markers today, but
nothing collects or lists them. This slice normalizes those markers into a
diagnostics model, shows them in a Problems panel grouped by file and jump-to-able,
and completes the status bar with a live error and warning count. The same model
is what an external language server (5.2) and a task problem matcher (5.11) feed
later, so the panel does not care where a diagnostic came from.

## Scope

In scope for this slice:

- A pure diagnostics model in `@vsclaude/core-shell`: a `Diagnostic` shape, a
  `DiagnosticSeverity` union, `summarizeDiagnostics` (counts by severity),
  `groupDiagnosticsByResource` (grouped and sorted for display), and the severity
  ordering helpers. Reusable and unit tested.
- A `useDiagnostics` hook that subscribes to Monaco's `onDidChangeMarkers`, reads
  the model markers, and maps them to the normalized `Diagnostic` list.
- A `ProblemsPanel` drawer docked above the status bar: problems grouped by file,
  each row showing severity, message, and position, and opening the file at that
  line when clicked.
- A status-bar item showing the error and warning counts (completing the bar from
  the previous slice), which toggles the Problems panel.
- A View: Problems command and a Ctrl or Cmd plus Shift plus M shortcut to toggle
  the panel, matching VS Code.

Explicit non-goals for this slice (tracked elsewhere in the matrix):

- External language servers (Python, Rust, and richer TS project diagnostics) are
  the LSP host slice (5.2). This slice consumes whatever markers Monaco already
  emits.
- Filtering the Problems panel by text or severity, and the file-tree problem
  decorations (5.7), are follow-ups; the model already exposes what they need.
- Quick fixes and the lightbulb (5.2).

## Contracts

No IPC change. `Diagnostic`, `DiagnosticSeverity`, `summarizeDiagnostics`,
`groupDiagnosticsByResource`, and `compareDiagnostics` are added to
`@vsclaude/core-shell` and exported from its barrel.

```
type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';
interface Diagnostic {
  resource: string;   // file path
  message: string;
  severity: DiagnosticSeverity;
  line: number;       // one-based
  column: number;     // one-based
  source?: string;    // for example "ts"
  code?: string;
}
```

## Acceptance criteria

1. `summarizeDiagnostics` returns the count of each severity. `groupDiagnosticsByResource`
   returns one group per resource, groups sorted by resource, and within a group
   the diagnostics sorted by severity (errors first) then by line then column.
2. The Problems panel lists the current diagnostics grouped by file. With none, it
   shows an empty state. Each row opens its file at the diagnostic's line.
3. The status bar shows the error and warning counts when there are any, or a "No
   Problems" item when there are none. Activating it toggles the panel.
4. View: Problems and Ctrl or Cmd plus Shift plus M both toggle the panel.
5. The panel is accessible: a labeled region, file groups as labeled subsections,
   and each problem a real button with an aria-label that includes the severity,
   message, and position.
6. Build, typecheck, lint, unit tests, the Playwright suite, and `cargo check` are
   green, and the matrix rows for 5.2 (diagnostics, Problems panel) and 5.5
   (Problems view) are updated.

## Validation checklist

- Unit: `summarizeDiagnostics` counts; `groupDiagnosticsByResource` grouping and
  ordering; the severity comparison.
- End to end: a Playwright test toggles the Problems panel open and asserts it is
  visible with its heading, and that the status bar carries a problems item.
