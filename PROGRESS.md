# Progress

A living handoff document. Written so the next engineer (or the next session) can
continue seamlessly.

## Last updated

2026-06-24. Session 3 (Step 0 plus forty-two parity slices, the last forty-one
self-paced by an autonomous /loop): quick open, status bar, problems, search,
source control, editor commands, diff editor, settings, Monaco theme binding,
keyboard shortcuts, terminal tabs, activity bar, welcome page, file icons, git
stash, zen mode, breadcrumbs, tasks, activity-bar badges, output panel, untitled,
more editor settings, markdown preview, document links, color decorators, outline,
git history, release notes, notification center, branch delete and rename, git tags,
gitignore action, svg preview, snippets, line height and font weight, ui scale and
wheel zoom, follow system theme, command categories, output log levels, diff setting,
json schemas, bracket guides and large-file mode.

## Slice 42: bracket pair guides and large-file optimizations (done)

Two text-editing wins (catalog 5.1; both rows moved to Done).

- **Setting**: AppSettings.editor gains bracketPairGuides, mapped to Monaco's
  guides.bracketPairs (on by default) and editable in the Settings panel.
- **Base options**: EditorPanel sets largeFileOptimizations and a
  maxTokenizationLineLength of 20000.
- **Quality**: 336 unit tests, typecheck, lint clean (no Rust change), the renderer
  build succeeds, and 34 Playwright e2e pass (the settings e2e now also finds Bracket
  Pair Guides). Matrix 5.1 bracket-guides and large-file rows moved to Done.

## Slice 41: JSON schemas for package.json and tsconfig.json (done)

Schema-driven JSON (catalog 5.2; the row moved to Done, 5.2's first Done).

- **Schemas** (`lib/json-schemas.ts`): minimal offline schemas for package.json and
  tsconfig.json. 3 unit tests for shape.
- **Wiring**: monaco-setup registers them via jsonDefaults.setDiagnosticsOptions, so
  those files get schema-driven validation and completion. (The json contribution
  exports jsonDefaults at runtime but ships no types for the deep path, so a small
  ambient declaration in vite-env.d.ts types the slice we use.)
- **Quality**: 336 unit tests (333 plus 3), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 34 Playwright e2e pass (no regression). Matrix 5.2
  json-schema row moved to Done.

## Slice 40: diff ignore-trailing-whitespace setting (done)

A diff setting (catalog 5.4).

- **Setting**: AppSettings.editor gains diffIgnoreTrimWhitespace; DiffView reads the
  editor-settings store and feeds Monaco's ignoreTrimWhitespace, editable in the
  Settings panel.
- **Quality**: 333 unit tests, typecheck, lint clean (no Rust change), the renderer
  build succeeds, and 34 Playwright e2e pass (the settings e2e now also finds Diff
  Ignore Trailing Whitespace). Matrix 5.4 diff-settings row moved to Partial.

## Slice 39: output log levels and filter (done)

Leveled logging (catalog 5.23).

- **Store** (`lib/output-log.ts`): entries now carry a level (info, warn, error);
  `appendLog(message, level)` and a pure `filterLog`. Workspace errors log at error
  level. Tests updated and a filter test added.
- **Panel**: the OutputPanel filters by level and colors warning and error lines.
- **Quality**: 333 unit tests, typecheck, lint clean (no Rust change), the renderer
  build succeeds, and 34 Playwright e2e pass (the output e2e now filters to errors and
  confirms the info line hides). Matrix 5.23 structured-logging row moved to Partial.

## Slice 38: command categories in the palette (done)

A category badge per command (catalog 5.6).

- **Helper** (`lib/command-title.ts`): `splitCommandTitle` splits "Git: View History"
  into a category and a label. 3 unit tests.
- **Palette**: command rows show the category as a muted badge before the label.
- **Quality**: 332 unit tests (329 plus 3), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 34 Playwright e2e pass (the new one checks the Git
  badge). Matrix 5.6 command-categories row moved to Partial.

## Slice 37: follow OS system theme (done)

Auto light/dark (catalog 5.16).

- **Helper** (`lib/system-theme.ts`): `themeForSystem` maps the OS preference to
  cozy-dark or cozy-light. 2 unit tests.
- **Setting and effect**: the workbench.followSystemTheme setting makes App listen to
  matchMedia(prefers-color-scheme) and switch themes while it is on.
- **Quality**: 329 unit tests (327 plus 2), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 33 Playwright e2e pass (the settings e2e now also
  finds Follow System Theme). Matrix 5.16 follow-system-theme row moved to Partial.

## Slice 36: UI scale and editor mouse-wheel zoom (done)

Two more appearance settings (catalog 5.16; both rows moved to Done).

- **Settings**: AppSettings gains uiScale (zooms the whole app shell via App.tsx
  style zoom) and editor.mouseWheelZoom (maps to Monaco's mouseWheelZoom, so Ctrl
  plus the wheel zooms the editor font). Both editable in the Settings panel.
- **Quality**: 327 unit tests, typecheck, lint clean (no Rust change), the renderer
  build succeeds, and 33 Playwright e2e pass (the settings e2e now also finds UI
  Scale). Matrix 5.16 wheel-zoom and UI-scale rows moved to Done.

## Slice 35: editor line height and font weight (done)

Two appearance settings (catalog 5.16; both rows moved to Done).

- **Settings**: AppSettings.editor gains lineHeight (0 derives from font size) and
  fontWeight (normal, medium, semibold, bold), mapped to Monaco (editorSettingsToMonaco)
  and editable in the Settings panel.
- **Quality**: 327 unit tests, typecheck, lint clean (no Rust change), the renderer
  build succeeds, and 33 Playwright e2e pass (the settings e2e now also finds Line
  Height). Matrix 5.16 line-height and font-weight rows moved to Done.

## Slice 34: built-in snippets (done)

Snippet completions (catalog 5.13).

- **Data** (`lib/snippets.ts`): built-in TypeScript and JavaScript snippets (clg, fn,
  afn, imp, todo) with snippet tabstops, plus `snippetsFor` and `SNIPPET_LANGUAGES`.
  4 unit tests.
- **Provider**: monaco-setup.ts registers a CompletionItemProvider that inserts them
  as snippets, alongside the language workers.
- **Quality**: 327 unit tests (323 plus 4), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 33 Playwright e2e pass (no regression). Matrix 5.13
  snippets row moved to Partial. Partial count reached 100.

## Slice 33: svg preview (done)

A safe SVG viewer (catalog 5.22).

- **Helpers** (`lib/preview.ts`): `isSvgPath` and `svgDataUrl` (an image data URL, so
  the SVG renders without executing any embedded script). 3 unit tests.
- **Viewer** (`ImagePreview.tsx`): Image: Open Preview shows the active .svg in an
  <img> over a checkerboard. A demo logo.svg was added.
- **Quality**: 323 unit tests (320 plus 3), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 33 Playwright e2e pass (the new one previews the
  demo SVG and checks the image src). Matrix 5.22 SVG-viewer row moved to Partial.

## Slice 32: add-to-gitignore action (done)

Ignore untracked files (catalog 5.9; row moved to Partial).

- **Native** (`git.rs` git_ignore_add): appends a pattern to .gitignore (creating it)
  without duplicates, registered in lib.rs. A new cargo test covers append and dedup
  (12 cargo tests now).
- **UI**: untracked files in the SourceControlPanel gain an Ignore action.
- **Quality**: 320 unit tests, typecheck, lint, cargo clean, the renderer build
  succeeds, and 32 Playwright e2e pass (no regression; the action is native-gated,
  so the cargo test covers it). Matrix 5.9 gitignore row moved to Partial.

## Slice 31: git tags (done)

Tag management (catalog 5.9; row moved to Partial).

- **Native** (`git.rs`): git_tags (newest first), git_create_tag (annotated or
  lightweight), git_delete_tag, registered in lib.rs. A new cargo test creates, lists,
  and deletes tags (11 cargo tests now).
- **UI** (`GitTagsModal.tsx`): Git: Tags opens a dialog that lists tags and lets you
  create and delete them.
- **Quality**: 320 unit tests, typecheck, lint, cargo clean, the renderer build
  succeeds, and 32 Playwright e2e pass (the new one opens the dialog; it shows the
  no-folder note in the browser, and the cargo tests cover the real operations).
  Matrix 5.9 tags row moved to Partial.

## Slice 30: branch delete and rename (done)

Completes branch operations (catalog 5.9; row moved to Done).

- **Native** (`git.rs`): git_delete_branch (safe delete) and git_rename_branch,
  registered in lib.rs. A new cargo test renames then deletes a branch (10 cargo
  tests now).
- **UI**: the SourceControlPanel branch picker gains a per-branch Delete (on hover)
  and a Rename for the current branch.
- **Quality**: 320 unit tests, typecheck, lint, cargo clean, the renderer build
  succeeds, and 31 Playwright e2e pass (no regression; git is native-gated, so the
  cargo tests cover it). Matrix 5.9 branch-operations row moved to Done.

## Slice 29: notification center (done)

A notification history (catalog 5.21).

- **Store** (`lib/notifications.ts`): a capped (100) newest-first store with add,
  dismiss, clear, and subscribe. 4 unit tests.
- **Center** (`NotificationCenter.tsx`): a panel (Notifications: Show) listing the
  history with per-item Dismiss and Clear all. Workspace errors and a couple of
  actions (git history without a folder, Markdown preview without a .md) post to it.
- **Quality**: 320 unit tests (316 plus 4), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 31 Playwright e2e pass (the new one posts a message
  and reads it in the center). Matrix 5.21 notification-center row moved to Partial.

## Slice 28: a What's New / Release Notes panel (done)

A capability summary (catalog 5.21).

- **Data** (`lib/release-notes.ts`): `RELEASE_NOTES`, a categorized capability
  summary. 3 unit tests for shape.
- **Panel** (`ReleaseNotes.tsx`): a modal opened by Help: Release Notes; Escape closes.
- **Quality**: 316 unit tests (313 plus 3), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 30 Playwright e2e pass (the new one opens the panel
  and checks a section heading). Matrix 5.21 what-is-new row moved to Partial.

## Slice 27: git commit history (done)

A commit history view (catalog 5.9; the row stays Partial since there is no graph
or per-file history, but git_log now exists).

- **Native** (`git.rs` git_log): recent commits, newest first, capped, unit-separator
  delimited so a subject is safe. Registered in lib.rs. Cargo tested (9 cargo tests).
- **Helper** (`lib/relative-time.ts`): `relativeTime` formats a past timestamp as
  "N units ago". 5 unit tests.
- **View** (`GitHistoryModal.tsx`): Git: View History lists commits (short hash,
  subject, author, relative date). Escape closes.
- **Quality**: 313 unit tests (308 plus 5), typecheck, lint, cargo clean, the renderer
  build succeeds, and 29 Playwright e2e pass (no regression; git is native-gated, so
  cargo and the relativeTime unit tests cover it).

## Slice 26: outline view and markdown document symbols (done)

An Outline view and a symbol source (catalog 5.3 and 5.5).

- **Symbols** (`lib/symbols.ts`): `markdownSymbols` extracts headings (level and
  line), skipping fenced code. 4 unit tests.
- **Provider**: monaco-setup.ts registers a markdown DocumentSymbolProvider over it,
  so Go to Symbol and the breadcrumb work in .md.
- **Outline** (`OutlinePanel.tsx`): a bottom-drawer view (View: Outline) listing the
  active file's symbols, indented by level, that reveals a line on click.
- **Quality**: 308 unit tests (304 plus 4), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 29 Playwright e2e pass (the new one lists the demo
  README headings). Matrix 5.3 outline-source and 5.5 outline-view rows moved to
  Partial.

## Slice 25: color decorators (done)

Color swatches and an inline picker (catalog 5.2).

- **Detection** (`lib/colors.ts`): `findColors` parses #hex (3, 4, 6, 8 digits) and
  rgb()/rgba() into normalized components with offsets, and `toHex` formats them
  back. 8 unit tests.
- **Provider**: monaco-setup.ts registers a DocumentColorProvider over findColors for
  many languages, so colors show a swatch and an inline picker.
- **Quality**: 304 unit tests (296 plus 8), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 28 Playwright e2e pass (no regression). Matrix 5.2
  color-decorators row moved to Partial. (Monaco swatches are not browser-e2e-able;
  the pure parsing is unit tested.)

## Slice 24: document links (done)

Clickable URLs in the editor (catalog 5.2).

- **Detection** (`lib/links.ts`): `findLinks` finds http, https, and bare www URLs
  in a line, strips trailing prose punctuation, and returns offsets. 5 unit tests.
- **Provider**: monaco-setup.ts registers a DocumentLinkProvider over findLinks for
  many languages, so URLs become clickable in any file.
- **Quality**: 296 unit tests (291 plus 5), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 28 Playwright e2e pass (no regression from the
  provider). Matrix 5.2 document-links row moved to Partial. (Monaco link clicking
  is not browser-e2e-able; the pure detection is unit tested.)

## Slice 23: markdown preview (done)

A safe Markdown preview (catalog 5.2).

- **Renderer** (`lib/markdown.ts`): `renderMarkdown` turns Markdown into HTML for
  headings, bold, italic, inline code, fenced code, links, lists, and paragraphs.
  It escapes raw HTML and sanitizes link hrefs (dropping javascript: and the like),
  so the output is not a script vector. The inline-code fence marker is built at
  runtime (String.fromCharCode(0)) so the source stays ASCII. 10 unit tests,
  including HTML-escape and unsafe-link cases.
- **Preview** (`MarkdownPreview.tsx`): a modal of the rendered active Markdown file,
  opened by the Markdown: Open Preview command. Escape closes it.
- **Quality**: 291 unit tests (281 plus 10), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 28 Playwright e2e pass (the new one previews the
  demo README and checks a heading and a link). Matrix 5.2 markdown row moved to
  Partial.

## Slice 22: more editor settings (rulers, whitespace, cursor) (done)

Extends the configurable editor (catalog 5.3 and 5.1).

- **Settings**: AppSettings.editor gains rulers (0 for none), renderWhitespace
  (none, selection, all), and cursorStyle (line, block, underline), mapped to
  Monaco (editorSettingsToMonaco) and editable in the Settings panel.
- **Quality**: 281 unit tests (280 plus 1), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 27 Playwright e2e pass (the new one finds the
  ruler and whitespace settings). Matrix 5.3 rulers row moved to Done.

## Slice 21: untitled scratchpad files (done)

A scratchpad when no folder is open (catalog 5.21).

- **Helper** (`lib/untitled.ts`): `untitledName` and `isUntitled`. 2 unit tests.
- **Command**: with no folder open, New Untitled File opens an editable Untitled-N
  in the editor (the counterpart of New File in a workspace).
- **Quality**: 280 unit tests (278 plus 2), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 26 Playwright e2e pass (the new one opens a
  scratchpad and checks the breadcrumb). Matrix 5.21 untitled row moved to Partial.

## Slice 20: the Output panel (done)

A log channel (catalog 5.21).

- **Log store** (`lib/output-log.ts`): an in-memory, capped (500-line) log with
  append, clear, and subscribe. 3 unit tests.
- **OutputPanel** (`OutputPanel.tsx`): a bottom-drawer view of the channel with a
  Clear, opened by View: Output or Ctrl or Cmd plus Shift plus U. App logs startup,
  workspace errors, and task runs.
- **Quality**: 278 unit tests (275 plus 3), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 25 Playwright e2e pass (the new one opens Output
  and reads the log). Matrix 5.21 output-channels row moved to Partial.

## Slice 19: activity-bar badges and a Problems item (done)

Enriches the activity bar (catalog 5.5; the roll-up stays Partial since view
containers are not yet relocatable).

- **Helper** (`lib/activity-view.ts`): `formatBadge` (hides zero, caps above 99),
  and `activeViewFor` now covers Problems. Tests updated and extended.
- **ActivityBar**: a Problems item, and count badges on Source Control (changed
  files) and Problems (errors plus warnings).
- **Quality**: 275 unit tests (273 plus 2), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 24 Playwright e2e pass (the new one opens the
  Problems panel from the activity bar).

## Slice 18: tasks (npm scripts) (done)

Task auto-detection and run-in-terminal (catalog 5.11, plus terminal send-text 5.10).

- **Detection** (`lib/tasks.ts`): `detectNpmTasks` reads package.json scripts into
  tasks that run `npm run <name>`, defensively (bad JSON yields none). 4 unit tests.
- **Run in terminal**: the terminal tabs model gains an optional `command`,
  TerminalPanel runs an `initialCommand` once the shell is up, and
  `requestRunInTerminal` opens a new terminal that runs a command. 1 more tabs test.
- **Palette**: App reads the workspace package.json and registers each script as a
  Run Task: <name> command that runs it in a new terminal.
- **Quality**: 273 unit tests (268 plus 5) and 8 cargo tests, typecheck, lint clean
  (no Rust change), the renderer build succeeds, and 23 Playwright e2e pass. Matrix
  5.11 auto-detection and quick-pick rows and 5.10 send-text moved to Partial.

## Slice 17: breadcrumbs (done)

A path bar above the editor (catalog 5.5).

- **Segments** (`lib/breadcrumbs.ts`): `breadcrumbSegments` splits a path into
  cumulative crumbs, stripping the workspace root so the trail stays relative. 4
  unit tests.
- **Breadcrumbs** (`Breadcrumbs.tsx`): the folders and file name above the editor;
  the file segment opens the document symbol picker (Go to Symbol). The editor and
  breadcrumbs are wrapped in an editor-wrap flex column.
- **Quality**: 268 unit tests (264 plus 4), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 23 Playwright e2e pass (the new one opens a file
  and checks the trail; all prior flows still pass through the layout change).
  Matrix 5.5 breadcrumbs row moved to Partial.

## Slice 16: zen mode (done)

A distraction-free toggle (catalog 5.5).

- **View: Toggle Zen Mode** sets `data-zen` on the app shell; the stylesheet hides
  the header, activity bar, bottom panels, status bar, and the explorer and right
  sidebar, leaving just the editor. Escape exits. The zen CSS is placed last so it
  wins source order over the per-mode app-main grids.
- **Quality**: 264 unit tests, typecheck, lint clean (no Rust change), the renderer
  build succeeds, and 22 Playwright e2e pass (the new one toggles zen, asserts the
  chrome is hidden, and restores it with Escape). Matrix 5.5 zen row moved to Done
  and full-screen to Partial.

## Slice 15: git stash (done)

Stash support in Source Control (catalog 5.9).

- **Rust** (`git.rs`): git_stash (push -u, include untracked), git_stash_pop, and
  git_stash_list, thin CLI wrappers. A cargo test stashes a change, asserts the
  tree is clean and the stash exists, pops, and asserts the change is back.
- **Parser** (`@vsclaude/git`): `countStashes` counts the stash-list entries. 2
  unit tests.
- **Source Control panel**: Stash Changes and Pop Stash (with a count) buttons,
  refreshed with the status.
- **Quality**: 264 unit tests (262 plus 2) and 8 cargo tests (5 search plus 3 git),
  typecheck, lint, and `cargo check` clean, the renderer build succeeds, and 21
  Playwright e2e pass. Matrix 5.9 stash row moved to Partial.

## Slice 14: file-type icons (done)

Per-type icons in the tree and tabs (catalog 5.7 and 5.16).

- **Icon mapping** (`lib/file-icons.ts`): `fileIconSpec` picks a folder, an image,
  or a document icon and a color from a name. 4 unit tests.
- **FileIcon** (`FileIcon.tsx`): draws the shape tinted by type. Wired into both
  explorers (ExplorerPanel, WorkspaceExplorer) and the editor tabs (WorkspaceEditor).
- **Quality**: 262 unit tests (258 plus 4), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 21 Playwright e2e pass (the new one asserts a
  file row shows an icon). Matrix 5.7 and 5.16 file-icon rows moved to Partial.

## Slice 13: the welcome page (done)

A Get Started page (catalog 5.21).

- **Welcome data** (`lib/welcome.ts`): the shortcut tips and a pure
  `welcomeQuickActions` builder that filters the Start actions to what is available
  (open folder, new file, settings, shortcuts, run a real agent). 3 unit tests.
- **WelcomePanel** (`WelcomePanel.tsx`): Start actions, recent projects, and the
  tips, opened by the Help: Welcome command.
- **Quality**: 258 unit tests (254 plus 4), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 20 Playwright e2e pass (the new one opens the
  welcome page and runs a quick action). Matrix 5.21 welcome row moved to Partial.

## Slice 12: the activity bar (done)

A left icon rail to reach the main views (catalog 5.5).

- **ActivityBar** (`ActivityBar.tsx`): Explorer, Search, Source Control, Settings,
  and Keyboard Shortcuts, with stroked inline icons and the active view
  highlighted. It wires to the existing view state and commands.
- **Layout**: the main row is wrapped in an `app-body` flex with the rail at the
  left; the bottom drawers now start right of the 48px rail. `activeViewFor`
  (`lib/activity-view.ts`) derives the highlight from the open bottom panel. 2 unit
  tests.
- **Quality**: 254 unit tests (252 plus 2), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 19 Playwright e2e pass (the new one clicks the
  rail to open the views; all prior flows still pass through the layout change).
  Matrix 5.5 activity-bar row moved to Partial.

## Slice 11: multiple terminals with a tab bar (done)

The first terminal productivity feature of catalog 5.10.

- **Pure tabs model** (`@vsclaude/terminal` `tabs.ts`): a reducer over the open
  terminals and the active one (open, close with neighbor focus, activate, rename).
  8 unit tests. The desktop app now depends on `@vsclaude/terminal`.
- **TerminalTabs** (`TerminalTabs.tsx`): a tab bar with new, switch, and close, and
  a stack of TerminalPanels (one PTY each) that stay mounted (inactive hidden, not
  unmounted) so scrollback survives switching. A Terminal: New Terminal command and
  a requestNewTerminal event also open one.
- **Quality**: 252 unit tests (244 plus 8), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 18 Playwright e2e pass (the new one adds, switches,
  and closes terminal tabs). Matrix 5.10 multiple-terminals row moved to Done.

## Slice 10: keyboard shortcuts reference (done)

A searchable view of every command and its shortcut (catalog 5.15).

- **Pure helpers** (`lib/shortcuts.ts`): `shortcutRows` turns the registered
  commands into sorted rows, `filterShortcutRows` filters by title, id, or key. 4
  unit tests.
- **Reference** (`KeyboardShortcuts.tsx`): a searchable table of commands and their
  keybindings, opened by the Preferences: Keyboard Shortcuts command. Read-only for
  now (no rebinding).
- **Quality**: 244 unit tests (240 plus 4), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 17 Playwright e2e pass (the new one opens and
  filters the reference). Matrix 5.15 moved to Done 3, Partial 2, Missing 6.

## Slice 9: Monaco theme binding (done)

The editor and diff editor now follow the app theme instead of hardcoding vs-dark
(catalog 5.16).

- **Pure mapper** (`lib/monaco-base-theme.ts`): `monacoBaseTheme` maps a theme's
  appearance and high-contrast flag to a Monaco base (vs, vs-dark, hc-black). Kept
  separate from Monaco so it is unit testable. 2 unit tests.
- **Theme binding** (`lib/monaco-theme.ts`): defines a Monaco theme from every
  bundled theme's tokens (which are hex) at module load, exposes the current theme
  through a store and `useMonacoTheme`, and `applyMonacoTheme` resolves the app
  theme and switches Monaco on a settings change. EditorPanel and DiffView read the
  bound theme.
- **Quality**: 240 unit tests (238 plus 2), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 16 Playwright e2e pass (the new one switches the
  app theme and asserts the editor follows from a vs-dark to a vs base). Matrix 5.16
  Monaco-theme-binding row moved to Done.

## Slice 8: editor settings and a Settings panel (done)

This ships catalog 5.14 and most of the editor-appearance rows of 5.16.

- **Contract**: `AppSettings` gains an `editor` block (fontSize, tabSize,
  insertSpaces, wordWrap, minimap, lineNumbers) with defaults; the persistence
  deep-merge absorbs it for old stored settings.
- **Editor settings store** (`lib/editor-settings.ts`): holds the live editor
  settings with a subscribe API and an `editorSettingsToMonaco` mapper. EditorPanel
  reads it through useSyncExternalStore and applies it to Monaco; App writes it
  whenever settings change. Unit tested.
- **Settings schema** (`lib/settings-schema.ts`): a data list of every setting,
  its control, and get and set on AppSettings, with `filterSettings`,
  `isSettingDefault`, and `defaultSettingValue`. Unit tested.
- **Settings panel** (`SettingsPanel.tsx`): a searchable, categorized modal with a
  modified indicator, a per-setting reset, and reset-all, opened by Ctrl or Cmd
  plus comma and the Preferences: Open Settings command.
- **Quality**: 238 unit tests (229 plus 9), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 15 Playwright e2e pass (the new one opens and
  searches the Settings panel). Matrix 5.14 moved to Done 2, Partial 2, and 5.16 to
  Done 10, Partial 2.

## Slice 7: the Monaco diff editor (done)

This ships catalog 5.4: a real diff editor, reachable everywhere.

- **DiffView** (`DiffView.tsx`): wraps the Monaco DiffEditor, read-only, with the
  built-in change navigation and collapsed unchanged regions. **DiffModal**
  (`DiffModal.tsx`) hosts it with a side-by-side and inline toggle.
- **Compare with Saved** (App.tsx): diffs the active editor's unsaved changes
  against disk, in the native workspace (draft vs disk) and the browser demo (edits
  vs bundled content), so it works everywhere and is e2e covered.
- **Source Control diff**: clicking a file in the Source Control panel opens its
  working-tree-vs-HEAD diff, with `diffSidesForCode` (in `@vsclaude/git`) deciding
  which sides exist for added, untracked, and deleted files.
- **Shared helper**: `languageForPath` is extracted to `lib/language.ts` and used
  by the editor and the diff view.
- **Quality**: 229 unit tests (222 plus 7), typecheck, lint clean (no Rust change),
  the renderer build succeeds, a DiffView Storybook story, and 14 Playwright e2e
  pass (the new one opens the diff editor via Compare with Saved). Matrix 5.4 moved
  to Done 3, Partial 3, Missing 2, and the 5.22 diff-editor row to Done.

## Slice 6: the editor command surface (done)

This exposes Monaco's editing actions, closing most of catalog 5.1.

- **Editor bridge** (`editor-bridge.ts`): `runEditorAction(actionId)` runs a
  built-in Monaco action on the active editor (preferring the registered action,
  falling back to trigger) and focuses it. 3 more unit tests.
- **Command catalog** (`lib/editor-commands.ts`): a data list mapping palette
  commands to Monaco action ids with their real default shortcuts: line operations
  (delete, move, copy, insert, join, indent, transpose, sort, trim), case
  transforms, multi-cursor and smart-select, comments, format document and
  selection, word wrap, fold, and find and replace. App registers them all. A
  sanity test guards unique ids and namespacing.
- **Quality**: 222 unit tests (216 plus 6), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 13 Playwright e2e pass (the new one runs an
  editor command from the palette). Matrix 5.1 moved to Done 8, Partial 14, Missing
  5, and 5.2 formatting moved to Partial.

## Slice 5: the source control panel (done)

The spec is `specs/SOURCE_CONTROL.md`; it ships the daily git workflow of 5.9.

- **Rust git commands** (`src-tauri/src/git.rs`): `git_stage`, `git_unstage`,
  `git_commit_staged`, `git_branches`, `git_checkout`, and `git_create_branch`,
  thin CLI wrappers like the existing ones, reached through `lib/tauri.ts` (git has
  always lived outside the typed IPC map). 2 cargo tests cover stage, commit,
  branch, create, and unstage on a temp repo.
- **Pure helper** (`@vsclaude/git`): `scmGroups` partitions the status model into
  Staged Changes and Changes (working tree plus untracked), with `scmChangeCount`.
  2 unit tests.
- **Source Control panel** (`SourceControlPanel.tsx`): staged and changes groups
  with per-file and bulk stage and unstage, a commit box that commits the staged
  set, and a branch control with an inline filterable picker (reusing
  filterQuickPick) that switches or creates a branch. Clicking a file opens it.
- **Integration**: the bottom drawer is now a single slot among Problems, Search,
  and Source Control (Ctrl or Cmd plus Shift plus M, plus F, plus G). A shared
  refresh nonce keeps the status-bar branch fresh after a panel action.
- **Quality**: 216 unit tests (214 plus 2) and 7 cargo tests (5 search plus 2 git),
  typecheck, lint, and `cargo check` clean, the renderer build succeeds, and 12
  Playwright e2e pass (the new one opens Source Control and checks the single slot).
  Matrix 5.9 moved to Done 5, Partial 6, Missing 13.

## Slice 4: project-wide search (done)

The spec is `specs/SEARCH.md`; it ships the find half of catalog 5.8.

- **Contract v5** (`packages/contracts`): added `search.find` with the
  `SearchOptions`, `SearchRange`, `SearchLineMatch`, `SearchFileResult`, and
  `SearchResult` types. `IPC_PROTOCOL_VERSION` is now 5, mirrored in Rust.
- **Rust engine** (`src-tauri/src/search.rs`): `run_search` is built on the same
  crates ripgrep is, `ignore` (gitignore-aware walking with include and exclude
  glob overrides) and `grep` (a fast regex matcher). It returns matches with line
  numbers, the line text, and code-point match ranges, capped so a huge tree
  cannot hang the UI; non-text files are skipped. 5 cargo tests cover literal,
  gitignore plus exclude, regex plus case, the cap, and the empty query. `cargo
  check` is clean.
- **Search panel** (`SearchPanel.tsx`): a debounced query, regex, case, and
  whole-word toggle buttons, include and exclude glob inputs, and a results tree
  grouped by file where each match highlights the hit and opens the file at the
  line. Pure view-model helpers (`searchModel.ts`: `splitLineByRanges`,
  `summarizeSearch`) are unit tested.
- **Bottom drawer**: the Problems and Search panels now share one bottom slot
  (opening one closes the other), toggled by Ctrl or Cmd plus Shift plus M and
  plus F and by the View: Problems and Search: Find in Files commands.
- **Quality**: 214 unit tests (207 plus 7) and 5 Rust tests, typecheck, lint, and
  `cargo check` clean, the renderer build succeeds, and 11 Playwright e2e pass (the
  new one opens Search and verifies the single bottom slot). Matrix 5.8 moved to
  Done 5, Partial 1, Missing 6.

## Slice 3: problems panel and diagnostics (done)

The spec is `specs/PROBLEMS_AND_DIAGNOSTICS.md`; it opens up the diagnostics
surface that 5.2 and 5.5 share and completes the status bar from slice 2.

- **Diagnostics model** (`@vsclaude/core-shell`): `diagnostics.ts` adds the
  `Diagnostic` shape and `DiagnosticSeverity`, plus `summarizeDiagnostics`,
  `groupDiagnosticsByResource`, and the severity ordering helpers. Reusable by any
  producer (a worker today, a language server or task matcher later). 7 unit tests.
- **Marker hook** (`apps/desktop/src/lib/useDiagnostics.ts`): subscribes to
  Monaco's onDidChangeMarkers, reads every model's markers, and maps them to the
  normalized model. When a real language server lands it publishes markers the
  same way, so the hook does not change.
- **Problems panel** (`ProblemsPanel.tsx`): a drawer above the status bar, grouped
  by file, each problem a button that opens its file at the line. Accessible region
  with labeled groups and per-problem aria-labels.
- **Status bar and toggles**: the bar now shows the error and warning count
  (completing slice 2), and the item toggles the panel. A View: Problems command
  and Ctrl or Cmd plus Shift plus M also toggle it.
- **Quality**: 207 unit tests (200 plus 7), typecheck, lint, and `cargo check`
  clean (no Rust change), the renderer build succeeds, and 10 Playwright e2e pass
  (the new one toggles the Problems panel from the status bar). Matrix moved 5.5
  Problems view to Done, 5.2 diagnostics to Partial, and 5.21 problems filtering to
  Partial.

## Slice 2: the workbench status bar (done)

The spec is `specs/STATUS_BAR.md`; this opens up catalog 5.5 and gives later
features (problems, search, task and debug state) a home to contribute to.

- **Status-bar model** (`@vsclaude/core-shell`): `status-bar.ts` adds a
  `StatusBarItem` shape and an `orderStatusItems` helper (filter by side, sort by
  priority with a stable id tie break). Reusable and unit tested.
- **Editor-status store** (`editor-bridge.ts`): alongside the active editor it now
  publishes a small `EditorStatus` snapshot (line, column, selection count,
  language, EOL, indentation) with a subscribe API. EditorPanel publishes it on
  mount and on cursor, selection, content, and model changes, and clears it on
  unmount. 2 more unit tests.
- **Status bar** (`StatusBar.tsx`): an always-present bottom strip in every
  presentation mode. Left: branch and change count (via the same porcelain path
  the review overlay uses, native only) and the workspace name. Right: language,
  EOL, indentation, cursor position, and a selection count. The cursor item opens
  go-to-line (new Ctrl or Cmd plus G, also a Go to Line/Column command), and the
  branch item opens the review overlay.
- **Quality**: 200 unit tests (193 plus 7), typecheck, lint, and `cargo check`
  clean (no Rust change this slice), the renderer build succeeds, and 9 Playwright
  e2e pass (the new one asserts the bar shows the cursor position and language and
  that clicking the cursor opens go-to-line). Matrix 5.5 moved to Done 4, Partial
  8, Missing 15.

## Slice 1: quick open and the quick-pick framework (done)

The spec is `specs/QUICK_OPEN.md`; this closes most of catalog 5.6 and builds the
reusable picker that later features lean on.

- **Contract v4** (`packages/contracts`): added `fs.walk`, a recursive file index
  (skips node_modules, .git, and build outputs, never follows a symlink, caps the
  result). `IPC_PROTOCOL_VERSION` is now 4 and the Rust const in `lib.rs` matches.
- **Rust core** (`fs_ops.rs`): `fs_walk` does an iterative, symlink-safe walk that
  skips unreadable subdirectories rather than failing. `cargo check` is clean.
- **Quick-pick framework** (`@vsclaude/core-shell`): `quick-pick.ts` adds the
  `QuickPickItem` shape, a `filterQuickPick` ranker that reuses the subsequence
  scorer, and a `parsePaletteInput` prefix router (`>` commands, `:` go to line,
  base mode otherwise; `@` and `#` reserved for the code-intelligence slice).
  `Command` gained an optional `keybinding` label. 13 new unit tests.
- **Editor bridge** (`apps/desktop/src/lib/editor-bridge.ts`): tracks the active
  Monaco editor so `:` go-to-line can reveal and select a line, clamped to the
  document bounds. EditorPanel publishes itself on mount and focus. 5 unit tests.
- **Palette** (`CommandPalette.tsx`): one component, two entry points (Ctrl or Cmd
  plus K for commands, plus P for files), live prefix routing, a real workspace
  file index (`useFileIndex`, demo files as the browser fallback), keybinding
  display, and accessible combobox and listbox semantics. New Go to File and Show
  All Commands palette entries advertise their real shortcuts.
- **Quality**: 193 unit tests (175 plus 18), typecheck, lint, and `cargo check`
  clean, the renderer build succeeds, and 8 Playwright e2e tests pass (the two new
  ones cover Ctrl or Cmd plus P file open and the `>` route back to commands). The
  feature matrix 5.6 roll-up moved to Done 7, Partial 0, Missing 4.

## Step 0: VS Code parity feature matrix (done)

`specs/FEATURE_MATRIX.md` is the new single source of truth for the editor and IDE
capability surface that vsclaude shares with VS Code. It audits the real repository
(source, IPC contracts, Rust core, tests) against the full catalog, section by
section, and is the gate for every parity slice that follows: only Partial and
Missing items become specs and slices, and a row moves to Done only when the
feature is implemented, tested, accessible, integrated, and documented.

State at the audit (2026-06-24): 329 capabilities across 23 sections, scored Done
49, Partial 77, Missing 198, Not planned 5. The largest gaps are code intelligence
(no external LSP host, 5.2), the workbench layout (a fixed presentation-mode shell
rather than a dockable workbench, 5.5), the git surface beyond status and commit
(5.9), and the terminal productivity surface (5.10). The AI agent and motion layer
is the product's own half and stays tracked in ROADMAP.md, not in this matrix.

## Phase A1: workspace and real filesystem (done)

vsclaude now opens a real project folder and works on real files, not the demo
fixture. The spec is `specs/WORKSPACE_AND_FILES.md`.

- **Contract v2** (`packages/contracts`): bumped `IPC_PROTOCOL_VERSION` to 2 and
  added the filesystem mutation surface (`fs.stat`, `fs.createFile`,
  `fs.createDir`, `fs.rename`, `fs.delete`, `fs.copy`), gave `fs.readFile` and
  `fs.writeFile` an `mtimeMs` for conflict detection, and added the `FileStat`
  type. The Rust core mirrors the version.
- **Rust core** (`fs_ops.rs`): real implementations of every new command plus the
  previously declared `fs.watch`/`fs.unwatch`, backed by `notify` (a 150 ms
  debounced recursive watcher that emits `fs:changed`) and `trash` (deletes go to
  the OS recycle bin, so they are recoverable). Every returned path is normalized
  to forward slashes for stable keys across platforms. Open-folder uses
  `tauri-plugin-dialog`. `cargo check` is clean with no warnings.
- **Pure model** (`@vsclaude/editor`): new `workspace/` modules with path helpers
  (normalize, parent, join, move validation, duplicate-name derivation), a lazy
  workspace-tree builder reusing the existing `flattenVisible` renderer, dir-merge
  and subtree-prune reconcilers, and the recent-projects model. 14 new unit tests.
- **Renderer**: a `useWorkspace` hook owns the open roots, the lazily loaded tree,
  open documents with dirty tracking and save-to-disk, all file operations, and
  live external-change reconciliation. New `WorkspaceExplorer` (lazy tree, context
  menu, inline create and rename, drag-and-drop move, dirty markers, a11y tree),
  `WorkspaceEditor` (tab bar, Monaco bound to the active document, external-change
  banner), and a small `ContextMenu`. Recent projects and open roots persist to
  local storage and restore on relaunch. With no folder open the app falls back to
  the demo experience, so the soul is intact.
- **Command palette**: Open Folder, Open Recent (one per remembered project), New
  File, Save All, and Close Folder.
- **Quality**: 172 unit tests pass (158 plus 14), typecheck and lint are clean
  (zero warnings), the renderer production build succeeds, all 6 Playwright e2e
  tests pass, and `cargo check` is clean.

## Earlier: Phase 0 and the native build (Session 1)

The notes below describe the foundation that Session 2 built on.

## Last updated (session 1)

2026-06-21. Session 1 (Phase 0 foundation, the action integration, the IDE shell, and the native desktop build).

## Working IDE shell

The browser renderer is now a real, multi-panel IDE that composes every package
end to end (run it with `pnpm dev`):

- **Session engine** (`apps/desktop/src/session/`): replays a scripted multi-agent
  session (an orchestrator delegating to two workers) through the real motion
  mapper, agent runtime, chat builder, and swarm helpers.
- **Panels**: file explorer (editor tree model), Pixie stage (Pixie performing the
  current action), swarm view (each agent performing its own action with token
  meters), conversation timeline with the tool-call inspector, token and cost
  dashboard, and a narrated accessibility stream.
- **Shell**: a command palette (Ctrl or Cmd plus K) driven by the core-shell
  registry, five presentation modes (companion, stage, swarm, minimal, cozy),
  runtime theming via the design system, reduced-motion and sound toggles, all
  persisted to local storage.

Builds (vite), typechecks, tests, and lints clean.

## Native desktop IDE (done)

The app now builds and runs as a real native desktop IDE:

- **Toolchain**: Rust stable on the MSVC host is installed; the existing Visual
  Studio C++ Build Tools and Windows SDK provide the linker. `pnpm tauri:build`
  produces the native `vsclaude.exe` plus a WiX `.msi` and an NSIS setup `.exe`.
  The window launches and runs the full renderer in WebView2.
- **Rust core**: filesystem ops, OS-keychain secrets (keyring), a real terminal
  PTY (portable-pty / ConPTY), and a live provider that spawns
  `claude --output-format stream-json` and streams it to the renderer.
- **Monaco editor**: real editing with offline workers, syntax, a minimap, and
  save, as the protagonist of the layout, with Pixie in a companion corner.
- **xterm terminal**: wired to the real PTY natively, with the agent's command
  activity as the browser fallback.
- **Diff review and commit**: a Rust git module (status, diff, commit) and a
  review overlay that lists changed files, shows each file's colored diff, and
  commits for real with "Accept all and commit".
- **Live session**: `useLiveProvider` normalizes the live stream through the same
  `parseClaudeStreamLine` adapter, so a real Claude Code run drives Pixie and the
  swarm; the recorded demo is the fallback.
- **Storybook**: a story for every component and every Pixie state (200 actions),
  with the a11y addon. `build-storybook` passes.
- **Playwright**: five e2e tests over the core flows, all passing.
- **Packaging**: a three-OS installer pipeline (`.github/workflows/desktop-release.yml`)
  and `BUILD.md` documenting signing.
- **Hardening**: strict CSP (with `worker-src` for Monaco), minimal Tauri
  capabilities, secrets only in the OS keychain. Pixie is a static SVG driven by a
  timer (no animation loop), so idle CPU is near zero.

## Remaining (needs your input or hosting)

- **Signed release**: provide the certificates and the build signs automatically
  (Windows Authenticode, Apple Developer ID notarization). See `BUILD.md`.
- **Auto-update**: generate the updater key (`tauri signer generate`), host
  `latest.json`, then add `tauri-plugin-updater`. Gated on choosing an update host.
- **Rive Pixie**: swap the pixel sprite for a Rive artboard driven by the motion
  mapper (its output is already the right shape).
- **Native-window e2e**: add tauri-driver plus WebdriverIO alongside the Playwright
  renderer suite.

## Agent action integration

The 200 agent behaviors shown in the banner are now a working part of the IDE,
wired through every layer:

- **Contracts**: a canonical `AgentAction` catalog (`packages/contracts/src/actions.ts`),
  200 actions across 20 categories, each mapped to its `AgentEventType`,
  `PixieState`, and a plain-language caption. `MotionDirective` gained an
  `actionId` field.
- **Motion**: `classifyAction(event)` (`packages/motion/src/classify.ts`) resolves
  any real event to its most specific action (git kind, command keywords, tool
  name). The mapper stamps the resolved `actionId` onto every directive.
- **Icons**: `scripts/gen-action-icons.mjs` extracts the 200 pixel symbols from
  the banner into a sprite (`apps/desktop/src/assets/pixie-actions.svg`), verified
  to match the catalog exactly. `ActionIcon` renders Pixie performing any action.
- **App**: the Pixie stage shows Pixie performing the current action, and the
  activity feed shows each event's action icon, label, and caption, with the
  action id in the drill-down.
- **Docs**: `docs/agent-actions.md` is generated from the catalog by
  `scripts/gen-actions-doc.mjs`.

All layers build, type, test, and lint clean.

## What the Phase 0 session delivered

The complete Phase 0 foundation, built, typed, tested, and linted clean.

- **Monorepo**: pnpm workspaces, TypeScript strict (with `noUncheckedIndexedAccess`
  and `verbatimModuleSyntax`), ESLint flat config, Prettier, Vitest, Changesets,
  EditorConfig. Root `tsconfig` project references across all packages.
- **Frozen contracts** (`packages/contracts`): the `AgentEvent` schema and typed
  payloads, the IPC command and event protocol, the `ProviderAdapter` contract,
  the Pixie motion shapes and the `EVENT_TO_STATE` table, the full design-token
  system with four bundled themes, the plugin API, and shared app state. 14 unit
  tests. This is the keystone; everything imports only from here.
- **Specs** (`specs/`): 27 specification documents, about 12,700 lines, covering
  the vision, architecture, event schema, providers, mascot, swarm, design system,
  editor, terminal, git, chat, MCP, permissions, context and checkpoints,
  settings, sessions, cost, onboarding, accessibility, sound, plugin SDK, testing,
  performance, security, build and distribution, and CI.
- **Twelve packages**, each with real initial domain logic, a passing test suite,
  and a README:
  - `design-system`: tokens to CSS variables, theme registry, theme resolution.
  - `core-shell`: immutable panel-tree layout model, fuzzy command registry.
  - `editor`: file-tree model, visible-row flattening, tab manager.
  - `terminal`: typed PTY client over the IPC contract, plus a fake transport.
  - `agent-runtime`: AgentEvent-to-AgentTree reducer, session manager.
  - `providers`: provider registry, Claude Code stream-json line parser.
  - `motion`: the event-to-motion mapper (captions, intensity, mood, priority,
    dwell, gaze). The brain of the soul.
  - `swarm`: roster, delegation edges, token aggregation, layout selection.
  - `chat`: timeline builder (collapses tool calls with results), turn grouping,
    inspector model.
  - `git`: `git status --porcelain` parser, git-action event builder.
  - `persistence`: session serialize and parse with validation, settings deep
    merge, in-memory secret store.
  - `plugin-sdk`: plugin host with manifest validation and registration lifecycle.
- **Desktop app** (`apps/desktop`): Tauri 2 shell with a Rust core implementing
  real filesystem and OS-keychain commands, and a React 19 renderer that plays a
  scripted demo session driving the Pixie stage and an activity feed with raw
  drill-down. The typed IPC bridge mirrors the contract.
- **Repository polish**: an attractive SVG banner, a professional README with
  badges, ROADMAP, CHANGELOG, CONTRIBUTING, code of conduct, security policy,
  issue and PR templates, and CI workflows.

## Quality gates (all green)

- `pnpm build:packages` builds all 13 packages via `tsc -b` project references.
- `pnpm -r run typecheck` is clean across every package and the app.
- `pnpm test` passes (every package has a real test suite).
- `pnpm lint` passes with no errors.
- Zero em dash characters anywhere in the repository.

## Key decisions

- **One event schema**: all providers normalize into `AgentEvent`; everything
  visual consumes only `AgentEvent`. This is the load-bearing decision.
- **Contracts are frozen and versioned** (`AGENT_EVENT_SCHEMA_VERSION`,
  `IPC_PROTOCOL_VERSION`, `PLUGIN_API_VERSION`). Payload types are declared as
  `type` aliases so they are assignable to the loose `payload` record without a
  cast.
- **pnpm workspaces** over npm for the monorepo. Documented in `specs/TECH_STACK.md`.
- **Packages ship real domain logic now, UI later.** The initial layers are pure,
  testable TypeScript that depend only on `@vsclaude/contracts`. React, Monaco,
  xterm, and Rive integrations are tracked in `ROADMAP.md` as the next milestones.
- **Authorship**: commits are attributed to the repository owner only.

## Next session should

1. Wire the `@vsclaude/motion` mapper into the desktop app, replacing the local
   `motion-lite` stand-in, so the demo runs through the real mapper.
2. Stand up the `design-system` component primitives and Storybook, with a story
   for every Pixie state and mood.
3. Begin the Monaco integration in `editor` and the xterm WebGL terminal wired to
   the Rust PTY.
4. Author the Rive artboard for Pixie and the sprite-sheet fallback.
5. Implement live process spawning in `providers` (Claude Code first) so a real
   session can drive the views end to end.

## Notes and caveats

- The Rust core (`apps/desktop/src-tauri`) is written but not yet compiled in this
  environment (the Rust toolchain was not installed). Install `rustup` plus the
  platform Tauri prerequisites, then `pnpm tauri:dev`. See
  `specs/BUILD_AND_DISTRIBUTION.md`.
- App icons are not yet generated. Run `pnpm --filter @vsclaude/desktop tauri icon
  <source.png>` to produce the `src-tauri/icons` set before a native build.
