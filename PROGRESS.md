# Progress

A living handoff document. Written so the next engineer (or the next session) can
continue seamlessly.

## Last updated

2026-06-24. Session 3 (Step 0 plus sixty-two parity slices, the last sixty-one
self-paced by an autonomous /loop): quick open, status bar, problems, search,
source control, editor commands, diff editor, settings, Monaco theme binding,
keyboard shortcuts, terminal tabs, activity bar, welcome page, file icons, git
stash, zen mode, breadcrumbs, tasks, activity-bar badges, output panel, untitled,
more editor settings, markdown preview, document links, color decorators, outline,
git history, release notes, notification center, branch delete and rename, git tags,
gitignore action, svg preview, snippets, line height and font weight, ui scale and
wheel zoom, follow system theme, command categories, output log levels, diff setting,
json schemas, bracket guides and large-file mode, in-file find, terminal find,
terminal menu, terminal tab rename, explorer problem decorations, search history,
tasks.json loading, git push/pull/fetch, commit amend, commit revert, on-save trim,
settings JSON editor, reset layout, task variables, task groups, files.exclude,
at-symbol navigation, hex view, notification toasts, inlay hints, menu bar,
edit menu, minimap config, diff settings, process info, snippet browser,
accessibility help, git remotes, problems filter, output channels, editor font,
diff change counter, terminal exit code, workspace symbols, open editors,
git stash manager, theme export, auto-reveal, narration log.

## Slice 142: Markdown broken-link diagnostics (done; honest no-flip)

Flag Markdown inline links whose target is not a known workspace file, in the Problems panel (catalog
5.2 markdown). A real Partial->Partial after the clean-well ran dry.

- lib/markdown-links.ts: findBrokenLinks(text, mdPath, files) -- pure, extracts [text](target) links,
  skips external/protocol-relative/anchor targets, strips a trailing #anchor or ?query, resolves the
  relative target against the doc's directory (resolveLinkTarget collapses . and ..), blanks fenced and
  inline code first so links shown as code are not analyzed, and flags targets not in the file set, with
  1-based line/column ranges. Unit tested (inline links only; reference-style links are not analyzed).
- EditorPanel: a new linkablePaths prop + a useEffect (mirroring the conflict-decoration effect) that,
  for .md files, computes findBrokenLinks and setModelMarkers(model, 'markdown-links', warnings); clears
  for non-md. The Problems panel reads these via useDiagnostics (onDidChangeMarkers). App.tsx passes
  linkablePaths = paletteFiles.map(f => f.id) (QuickPickItem.id is the path; demo + workspace).
- A demo notes.md (in BOTH demoFileContents and demoFiles) links to src/App.tsx (valid) and CHANGELOG.md
  (missing). An e2e opens notes.md, opens Problems, and asserts the "Link target not found: CHANGELOG.md"
  warning. typecheck, lint clean; build + full e2e pass.
- HONESTY: narrows the 5.2 gap by removing "broken-link diagnostics"; synced-scroll, link/path
  completion, and math/diagram rendering remain, so 5.2 STAYS Partial. TOTAL unchanged 129/102/97.
- Review: 1 major (the demo/native wiring trap again) + minors, all fixed. linkablePaths was passed only
  to the demo EditorPanel, NOT to WorkspaceEditor -> in a real workspace EVERY valid link was false-flagged
  (undefined treated as an empty set). Fixed: threaded linkablePaths through WorkspaceEditor, AND EditorPanel
  now SKIPS marking when linkablePaths is undefined (defense-in-depth, no false positives). Also broadened
  the link regex to validate titled links [a](target "title") with a robust target offset (indexOf from the
  "](" opener, not lastIndexOf), plus a unit test. The e2e covers the demo path; the native path is wired
  identically (not browser-e2e-able). Reference-style links remain out of scope.

## Slice 141: Ctrl/Cmd+Shift+P opens the command palette (done; Done-row parity polish)

Add VS Code's iconic command-palette shortcut. The palette was opened by Ctrl/Cmd+K only; Ctrl+Shift+P
(which every VS Code user reaches for) fell through to the Ctrl+P files branch.

- CommandPalette.tsx keydown listener: a new first case (ctrl/meta + shift + p) -> toggleTo('commands'),
  placed before the Ctrl+P files case so Ctrl+Shift+P no longer opens files. Ctrl+K still opens commands.
- App.tsx show-commands command: keybinding metadata 'Ctrl+K' -> 'Ctrl+Shift+P' (the VS Code-standard,
  now shown in the Keyboard Shortcuts reference and known to the conflict detector); Ctrl+K keeps working
  via the listener (the e2es that press Ctrl+K still pass).
- Quality: typecheck, lint clean; the keyboard-shortcuts conflict e2e still reports no conflicts (Ctrl+Shift+P
  is unique); a new e2e presses Ctrl+Shift+P and asserts the palette opens in COMMAND mode (the
  'type a command' placeholder, distinguishing it from the Ctrl+P files mode). build + full e2e pass.
- HONESTY: the command-palette row (5.6) is already Done; this is parity POLISH on a Done row (adds the
  standard shortcut), so there is NO matrix count/status change. Evidence updated in the two palette rows
  and the 5.6 prose. TOTAL unchanged 129/102/97.
- Review: 2 minors, both the consistency ripple of changing the advertised shortcut (the slice-133 lesson):
  the welcome "Learn the keys" tip (lib/welcome.ts) still showed Ctrl/Cmd+K -> updated to Ctrl/Cmd+Shift+P;
  and specs/QUICK_OPEN.md (cited by the 5.6 prose) still documented Ctrl+K -> updated to lead with
  Ctrl/Cmd+Shift+P (Ctrl/Cmd+K legacy alias). Both fixed.

## Slice 140: restore sidebar visibility and the open panel across a reload (done; honest no-flip)

Extend layout-state persistence (catalog 5.5) so a reload restores the primary sidebar visibility and
the open bottom panel, alongside the active file (slice 139) and presentationMode.

- lib/layout-state.ts: BOTTOM_PANELS + BottomPanel/RestorablePanel types + parseBottomPanel(saved) (pure,
  validates against the known panels, falls back to 'none'; unit tested). App.tsx: sidebarHidden inits
  from localStorage('vsclaude.sidebarHidden')==='true'; bottomPanel inits from
  parseBottomPanel(localStorage('vsclaude.bottomPanel')); lastBottomPanelRef is seeded from the restored
  panel so Ctrl+J after a reload reopens the same one; two useEffects persist both on change. Reused the
  shared BottomPanel type for the existing bottomPanel state and the lastBottomPanel ref (single source).
- Quality: typecheck, lint clean; parseBottomPanel unit tested; a new e2e hides the sidebar (Ctrl+B) and
  opens Problems (Ctrl+Shift+M), reloads, and asserts both survive. The search-history reload e2e was
  updated: the Search panel now restores OPEN across reload, so its redundant reopen (Ctrl+Shift+F, which
  would have toggled it closed) was removed -- it now also implicitly verifies the panel restore. build +
  full e2e pass. No interference: a fresh context has no saved values, so the defaults apply.
- HONESTY: additive within 5.5 (adds sidebar/panel visibility persistence); the gap (editor split sizes,
  dockable panel positions, multi-tab order, native active tab) is unchanged, so 5.5 STAYS Partial. TOTAL
  unchanged 129/102/97.

## Slice 139: restore the active file across a reload (done; honest no-flip)

Persist the browser demo's active editor file so a reload reopens it (catalog 5.5 "Layout persistence
across sessions"), via the established localStorage pattern.

- lib/active-file.ts: parseActiveFile(saved, validPaths, fallback) -- pure, returns the saved path only
  when it still names a known file, else the fallback; unit tested. App.tsx: openFile initializes from
  localStorage('vsclaude.activeFile') through parseActiveFile (validated against DEMO_FILE_PATHS) and a
  useEffect persists it on change.
- Quality: typecheck, lint clean; the parseActiveFile unit tests pass; an e2e opens session.ts, asserts a
  session.ts-only symbol (isExpired), reloads, and asserts it is still shown (the persisted file reopened,
  not the default login-form.tsx). build + full e2e pass. No e2e interference: a fresh context has no
  saved value, so the default file still opens.
- HONESTY (general-gap scoping, the slice-130 lesson): this covers the BROWSER DEMO active file (openFile)
  only. The NATIVE workspace's active tab (ws.activePath) is a different state and is NOT persisted by this
  slice -- the gap now says so explicitly, alongside split sizes, panel positions, and multi-tab order. So
  5.5 STAYS Partial. TOTAL unchanged 129/102/97.
- Review: 1 nit (non-blocking, no code change). The demo's pre-existing follow-agent auto-play
  (setOpenFile on path-bearing demo events) overrides the restored file roughly 9s into replay; the
  restore is genuine at mount and the e2e asserts well within that window (~9s margin, resolves <1s, not
  flaky). The persistence claim is mount-time restore-on-reload; the auto-play following the agent
  afterward is unchanged demo behavior.

## Slice 138: Ctrl/Cmd+Shift+B runs the build task (done; honest no-flip)

Wire the standard VS Code build-task chord (catalog 5.11 "Task groups ... and default task").

- The Tasks: Run Build Task command already existed (App.tsx, runs the first build-group task); the gap
  was "no Ctrl or Cmd plus Shift plus B keybinding wired." NOTE: the global key handler uses explicit
  per-key if-blocks, so the command-registry `keybinding:` field is only metadata (palette/reference
  display) -- it does NOT auto-wire the keydown. Added BOTH: keybinding: 'Ctrl+Shift+B' on the command
  (shown in the Keyboard Shortcuts reference, no conflict) AND a `b` case in the Ctrl/Cmd+Shift chord
  block that invokes the command. Because that key effect is mount-once ([] deps), it reaches the latest
  command via a new registryRef (a useEffect keeps registryRef.current = registry, whose deps include
  npmTasks), then registryRef.current.get('tasks-run-build').run().
- Quality: typecheck, lint clean; the keyboard-shortcuts conflict e2e still reports "no keybinding
  conflicts"; a new e2e blurs the editor and presses Ctrl+Shift+B, asserting the "No build task found in
  this folder." notification (the demo has no scripts), which proves the chord fires the command. build +
  full e2e pass.
- HONESTY: narrows the gap by removing the keybinding clause; the OTHER clause ("no persisted default
  task") remains, so 5.11 STAYS Partial. TOTAL unchanged 129/102/97.

## Slice 137: inlay-hints editor setting (done; honest no-flip)

Diversified away from the outline series. Expose inlay-hints rendering as a user setting (catalog 5.2
"Inlay hints"), parity with VS Code's editor.inlayHints.enabled (exposed as a boolean on/off subset of
its four-value enum).

- Inlay hints were hardcoded `inlayHints: { enabled: 'on' }` in EditorPanel with no user control. Added
  the setting via the proven pattern, mirroring stickyScroll exactly: contracts EditorSettings.inlayHints
  + DEFAULT (true); editor-settings.ts MonacoEditorOptions.inlayHints + the mapper (true -> 'on', false
  -> 'off'); removed the EditorPanel hardcode (now from the mapper spread); settings-schema.ts boolean
  control "Inlay Hints"; settings.test.ts (defaults + a mapper test). Rebuilt @vsclaude/contracts.
- Quality: typecheck, lint clean; settings unit suite green; the existing "settings expose ..." e2e now
  also asserts the Inlay Hints control; build and full e2e pass.
- HONESTY: this ADDS the user-facing toggle (a real VS Code setting); it does NOT narrow the row's stated
  gap ("no custom InlayHintsProvider for other languages"), which remains. The evidence notes the toggle;
  the row STAYS Partial. TOTAL unchanged 129/102/97.

## Slice 136: TOML outline (done; honest no-flip)

Add TOML structure to the Outline view (catalog 5.3 outline), extending JSON + CSS + YAML.

- lib/workspace-symbols.ts: tomlSymbols(text) -- a pure per-line scan emitting [table] and
  [[array-of-table]] headers plus top-level keys before the first table; keys under a table are
  skipped (the header represents them); comments/blanks ignored; the contents of multi-line strings
  (""" / ''') are skipped so a bracketed line inside one is not mistaken for a table. outlineSymbols
  routes .toml through it.
- A demo Cargo.toml added to BOTH demoFileContents and demoFiles (separate sources).
- Quality: tomlSymbols unit tested (tables + [[array]] + top-level keys, comments/blanks/under-table
  keys skipped, multi-line-string brackets not mistaken for tables, .toml routing). An e2e opens
  Cargo.toml and asserts the outline lists package and dependencies. typecheck, lint clean; build and
  full e2e pass. Updated the 5.3 row, 5.3 prose, and 5.6 @ row (slice-133 lesson).
- HONESTY (review caught 1 minor): a triple-quote inside a TRAILING comment (x = 1 # has """ here)
  falsely opened a multi-line block (the delim scan ran over the trailing comment) and swallowed later
  tables -- fixed with a string-aware strip of the unquoted trailing comment before the delim scan, plus
  a regression test. 5.3 STAYS Partial
  (SCSS/LESS, HTML, YAML quoted keys, code nesting, Python remain). TOTAL unchanged 129/102/97.

## Slice 135: YAML outline (done; honest no-flip)

Add top-level YAML mapping keys to the Outline view (catalog 5.3 outline), extending JSON + CSS.

- lib/workspace-symbols.ts: yamlSymbols(text) -- a pure per-line scan emitting column-0 mapping keys
  (/^[A-Za-z_][\\w.$-]*\\s*:(\\s|$)/) with their line; skips indented/nested keys, list items, comment
  lines, and bare scalars; the value after the colon (including URLs) is ignored. outlineSymbols routes
  .yaml/.yml through it.
- A demo config.yml added to BOTH demoFileContents and demoFiles (separate sources).
- Quality: yamlSymbols unit tested (nested/list/comment skipped, URL value kept, no-space-after-colon
  rejected, .yaml/.yml routing). An e2e opens config.yml and asserts the outline lists build and scripts.
  typecheck, lint clean; build and full e2e pass. Updated the 5.3 row, 5.3 prose, and 5.6 @ row
  (slice-133 lesson). 5.3 STAYS Partial (SCSS/LESS, HTML, TOML, YAML quoted keys, code nesting, Python
  remain). TOTAL unchanged 129/102/97.

## Slice 134: CSS outline (done; honest no-flip)

Add top-level CSS selectors to the Outline view (catalog 5.3 outline), extending the JSON slice.

- lib/workspace-symbols.ts: cssSymbols(text) -- a pure, string-aware scan that tracks brace depth and
  emits depth-0 selectors with their start line; skips block comments (handled in-loop so /* or */ inside
  a string is not a delimiter), at-rules (starting @), at-rule inner rules (depth > 0), declarations
  inside a rule, and bare ;-statements; joins multi-line selectors; ignores braces inside strings.
  outlineSymbols routes .css through it.
- A demo src/styles.css was added to BOTH demoFileContents (content) AND demoFiles (the explorer tree
  list -- they are separate sources; the tree is built from demoFiles).
- Quality: cssSymbols unit tested (multi-selector, multi-line join, @media + comments skipped, @import
  skipped, braces-in-strings/attribute-selectors ignored, /* */ inside strings across rules, .css
  routing). An e2e opens styles.css and asserts the outline lists .app and .button. typecheck, lint
  clean; build and full e2e pass.
- HONESTY (review caught two real minors): (1) // line comments (idiomatic in SCSS/LESS) were NOT
  handled, so the original .scss/.less routing produced wrong outlines -- NARROWED to .css only (handling
  // safely conflicts with url(http://...) so SCSS/LESS is deferred, listed in the gap); (2) the old
  /* */ regex pre-pass was not string-aware -- moved block-comment handling into the loop. Per the
  slice-133 lesson updated the 5.3 row, the 5.3 prose, and the 5.6 @ row (all say CSS). 5.3 "Outline
  rendering source" STAYS Partial (SCSS/LESS, HTML, YAML/TOML, code nesting, Python remain). TOTAL
  unchanged 129/102/97.

## Slice 133: JSON outline (done; honest no-flip)

Add JSON top-level keys to the Outline view (catalog 5.3 outline).

- lib/workspace-symbols.ts: jsonSymbols(text) -- a pure, string-aware brace-depth scan emitting the
  root object's top-level keys with their line numbers; ignores nested keys, array elements, and colons
  inside string values. outlineSymbols routes .json files through it (level 1).
- Quality: jsonSymbols unit tested (nested ignored, array/colon-in-string ignored, escaped quotes don't
  end the string early, .json routing). An e2e opens package.json and asserts the outline lists its keys
  (version, private). Updated a pre-existing test that used a .json file to expect [] -- JSON now
  correctly outlines, so it now uses a .txt file for the no-outline case. typecheck, lint clean; build
  and full e2e pass.
- Matrix 5.3 "Outline rendering source" evidence updated (JSON added); STAYS Partial (CSS/SCSS/LESS,
  HTML, YAML/TOML, code nesting, and Python remain). TOTAL unchanged 129/102/97.

## Slice 132: toggle maximized bottom panel (done; honest no-flip)

Add VS Code's "Toggle Maximized Panel" for the bottom dock (catalog 5.5).

- App: a bottomMaximized state + a View: Toggle Maximized Panel command set data-bottom-maximized on the
  app-shell; styles.css overrides --bottom-height to calc(100vh - 7.5rem) when maximized, so the dock
  fills the workbench and squeezes the editor.
- Quality: an e2e runs the command via the palette and asserts data-bottom-maximized flips false->true
  (inherently strong: without the command the toggle never fires). The adversarial review caught a minor
  bug -- the override also matched the minimal-mode narration footer (higher CSS specificity than
  .app-bottom--minimal), so maximizing in minimal mode blew it up; fixed by scoping the selector with
  :not(.app-bottom--minimal), with a regression e2e (minimal mode + maximize -> footer stays small,
  validated to fail without the fix). typecheck, lint clean; build and full e2e pass.
- HONESTY: while here, corrected stale claims in the 5.5 "Bottom panel" row -- the gap listed "cannot
  maximize" (now done) and "cannot sash-resize" (done in slice 110, the bottom Sash). Both removed; the
  row STAYS Partial (no problems/output/debug as panel tabs; panel cannot be moved). TOTAL unchanged
  129/102/97 -- this is a real feature + honesty correction, not a count-move.

## Slice 131: typed-confirmation gating for commit amend (done)

Gate the history-rewriting Amend behind a typed confirmation (catalog 5.9).

- lib/scm-commit.ts: amendConfirmed(typed) (true when typed trims/lowercases to "amend") and
  commitDisabled({busy, message, amend, stagedCount, amendConfirm}) -- pure, unit tested. commitDisabled
  reproduces the prior button rules and adds: when amend is on, the button stays disabled until the
  confirmation is typed.
- SourceControlPanel: an amendConfirm field appears when Amend is checked; the commit button uses
  commitDisabled; the confirmation resets both when Amend is toggled and after each successful commit, so
  every history-rewriting amend re-requires it (the review noted it previously persisted across back-to-
  back amends).
- Quality: scm-commit unit tests cover amendConfirmed and every commitDisabled branch (incl. the amend
  gate). typecheck, lint clean; build and full e2e pass. Git UI is native and cargo-tested; the browser
  demo has no repo so the SCM panel is not browser-e2e'd (consistent with other git features) -- the
  gating logic is verified by the pure unit tests. Matrix 5.9 "Commit amend" Partial to Done; 5.9 now
  9/8/7; TOTAL 129/102/97.

## Slice 130: default EOL for new untitled files (done; honest no-flip)

Give new untitled scratchpads a configurable / OS-default line ending (catalog 5.1).

- contracts: EditorSettings gains defaultEol ('auto' | 'LF' | 'CRLF', default 'auto').
- lib/eol.ts: resolveDefaultEol(setting, isWindows) (pure; auto -> CRLF on Windows, LF elsewhere) and
  isWindowsPlatform(). EditorPanel applies it to a new untitled model via model.pushEOL, once per path
  (eolAppliedRef guard) so clearing the buffer later does not override a manual EOL choice.
- settings-schema: an Editor select (Auto/LF/CRLF).
- Quality: resolveDefaultEol unit tested. An e2e forces LF (Monaco defaults a new model to CRLF on this
  Windows env), creates an untitled, and asserts the status-bar shows LF. Validated STRONG against a
  FRESH dev server: with the effect disabled the untitled is CRLF, so the LF assertion fails.
- HONESTY (review caught a MAJOR overstatement): the matrix gap "No platform-default EOL for newly
  created files" is GENERAL. This slice covers only the untitled scratchpad; the explorer/palette
  "New File" path (ws.newFile, native) creates a real workspace file that isUntitled() rejects, so it
  still uses Monaco's default. That path is native-only (not e2e-able in the browser demo), so the row
  STAYS Partial with a narrowed gap, NOT a Done flip. 5.1 stays 23/4/0; TOTAL stays 128/103/97.
- NOTE: playwright.config webServer uses reuseExistingServer:true; a reused dev server serves STALE
  source, so disable-validation must kill port 1420 first to force a fresh server.

## Slice 129: preferred dark/light themes for follow-system (done)

Let users pick which theme follow-system uses in each mode (catalog 5.16).

- contracts: AppSettings gains preferredDarkTheme and preferredLightTheme (defaults cozy-dark/cozy-light).
- system-theme.ts: themeForSystem(prefersDark, darkTheme?, lightTheme?) is parametrized (defaults preserve
  the old behavior); still pure and unit tested.
- App: the follow-system effect passes s.preferredDarkTheme/Light (read fresh inside setSettings) and
  re-applies when either preference changes (added to the effect deps).
- settings-schema: two Appearance selects over the bundled theme ids.
- Quality: themeForSystem unit tests cover the supplied preferences and the default fallback; an e2e
  emulates an OS dark preference with preferredDarkTheme=high-contrast and asserts html data-theme is
  high-contrast. Validated STRONG: it fails when the preference is not wired through App. typecheck,
  lint clean; build and full e2e pass. Matrix 5.16 "Follow OS system theme" Partial to Done; 5.16 now
  19/1/3; TOTAL 128/103/97.
- Honesty: also refreshed specs/SETTINGS_THEMES_PERSISTENCE.md -- its follow-system prose described the
  old cozy-pair-only behavior (now superseded by the preferred-theme selects), and it listed a stale
  theme id 'colorblind-safe' (the contract id is 'cozy-cb-safe'); both corrected (the review surfaced
  the id drift as pre-existing).

## Slice 128: scroll the revealed file into view (done)

Complete auto-reveal by scrolling the revealed explorer row into view (catalog 5.7).

- ExplorerPanel (panels/): a guarded callback ref on the OPENED file's row (keyed to openPath, not the
  active set) scrolls it into view (scrollIntoView block nearest) once per open-file change. A callback
  ref (not an effect) fires when the row is actually in the DOM, after the auto-reveal expands its
  ancestors, so it survives the expand-then-render timing; lastRevealedRef gates it to one scroll.
- IMPORTANT (review caught a MAJOR bug): keying the ref off `active` (openPath || activePath) attached it
  to TWO rows whenever the agent's activePath differed from the opened file; refs attach in document
  order, so the higher activePath row consumed the single scroll and the opened file was NOT revealed --
  the exact thing this slice fixes, reintroduced in the normal running-session state. Fixed by keying
  the ref to row.node.path === openPath.
- Quality: a short-viewport e2e opens a bottom-of-tree file (package.json) and asserts its row is in the
  viewport (STRONG: fails when scrollIntoView is removed); a second regression e2e pauses the session on
  a different activePath and confirms the opened file still scrolls in (STRONG: fails with the activePath
  bug). typecheck, lint clean; build and full e2e pass. Matrix 5.7 "Auto-reveal active file" Partial to
  Done; 5.7 now 7/4/3/3; TOTAL 127/104/97.

## Slice 127: persist search history across reloads (done)

Make the search box's recent-query history survive a reload (catalog 5.8).

- search-history.ts gains parseSearchHistory (pure, tolerates corrupt/null/non-array storage and caps at
  20), loadSearchHistory, and saveSearchHistory (localStorage, guarded for non-browser envs).
- SearchPanel initializes its history state from loadSearchHistory() and persists on change via an
  effect. Up/Down recall still works; now the list is restored after a reload.
- Quality: parseSearchHistory unit tested (valid array, null/invalid JSON/non-array, non-string and
  empty entries dropped, cap); an e2e searches a query, reloads the page, and recalls it with Up;
  typecheck, lint clean; build and full e2e pass. Matrix 5.8 "Search history" Partial to Done; 5.8 now
  6/1/5; TOTAL 126/105/97.

## Slice 126: toggle editor read-only (done)

Add VS Code's "Toggle Active Editor Read-only" as a session command (catalog 5.1).

- App: a session-scoped editorReadOnly state and a View: Toggle Editor Read-only command flip it.
  EditorPanel gains a readOnly prop applied as Monaco's readOnly option (placed after the settings
  spread so a future settings-sourced readOnly cannot override it) and mirrors it as data-readonly on
  the panel for styling/tests.
- Quality: an e2e toggles read-only via the palette, asserts data-readonly and that typing is rejected
  (first line unchanged), then toggles back to editable; typecheck, lint clean; build and full e2e pass.
- Honesty: the 5.1 "Read-only editors and read-only regions" evidence claimed "FilePayload has readonly"
  but FilePayload (event-payloads.ts) has no such field; corrected. The row stays Partial -- this adds a
  manual session toggle, not a per-file readonly flag from fs/IPC, and no read-only regions. No flip.
  TOTAL unchanged 125/106/97.

## Slice 125: word wrap mode, column, and wrapping indent (done)

Complete the word-wrap row with the wrap mode, column, and indent as settings (catalog 5.1).
(Note: an earlier slice-125 attempt to add a global Alt+Z binding was reverted -- Monaco already binds
Alt+Z and the keyboard-shortcuts conflict detector correctly rejected the duplicate.)

- contracts: editor.wordWrap becomes an enum (off/on/wordWrapColumn/bounded, default off) and gains
  wordWrapColumn (default 80) and wrappingIndent (none/same/indent/deepIndent, default same). All three
  defaults match Monaco's runtime defaults (editorOptions.js).
- persistence: mergeSettings migrates a legacy boolean wordWrap (true/false) to the enum (on/off) before
  merging, operating on the opaque record so it sees the raw stored value. Unit tested.
- editor-settings.ts maps all three to Monaco; settings-schema.ts turns Word Wrap into a select and adds
  a column number control and a wrapping-indent select. The mapper test covers the mode/column/indent.
- Quality: contracts + persistence build; typecheck, lint clean; build and full e2e pass; the matrix
  integrity check passes. Matrix 5.1 "Word wrap and wrap column control" Partial to Done; 5.1 now 23/4/0;
  TOTAL 125/106/97.

## Slice 124: modal focus trap (done)

Trap Tab focus within an open modal, pairing with slice 123's focus restore (catalog 5.20).

- lib/focus-restore.ts: a useFocusTrap(ref, active) hook installs a window capture keydown listener
  that, on Tab, wraps focus from last to first (and Shift+Tab first to last) within the container and
  pulls focus back in if it has escaped. A window listener (not the container) keeps the trap effective
  even if focus leaves the modal.
- Applied (with a container ref) to the command palette, theme export/import modals, and notification
  center -- the same modals as the focus-restore hook.
- Quality: an e2e opens the theme-export modal and Tabs/Shift+Tabs repeatedly, asserting focus never
  escapes the dialog; typecheck, lint clean; build and full e2e pass. Matrix evidence updated for two
  5.20 rows (focus-trap hook done in "Focus management ..."; modal focus trap done in "Full keyboard
  operability ...") -- both stay Partial (per-mode focus order, and Alt+Z/Alt+H/Ctrl+. remain),
  no flip. TOTAL unchanged 124/107/97.

## Slice 123: modal focus restore (done)

Return focus to the trigger when a modal closes, like VS Code (catalog 5.20 focus management).

- lib/focus-restore.ts: a module-level focusin tracker records the last focus OUTSIDE any [role=dialog],
  and a useFocusRestore(open) hook refocuses it when a modal closes. This works regardless of how each
  modal focuses its own content on open (the tracker captures the background focus independently),
  sidestepping the autofocus-timing problem.
- Applied to the command palette, the theme export/import modals, and the notification center.
- Quality: an e2e focuses the sidebar sash, opens the palette, presses Escape, and asserts focus
  returns to the sash; typecheck, lint clean; build and full e2e pass. Matrix 5.20 "Focus management
  with roving tabindex and restoration" evidence updated (modal focus restore done; a reusable
  focus-trap hook and per-mode focus order remain) -- stays Partial, no flip. TOTAL unchanged 124/107/97.

## Slice 122: drag-drop / whole-line-copy / multi-paste settings (done)

Expose the last cluster of editing-behavior options as settings (catalog 5.1).

- contracts EditorSettings + DEFAULT_SETTINGS gain dragAndDrop, emptySelectionClipboard, and
  multiCursorPaste. All three defaults (dragAndDrop true, emptySelectionClipboard true, multiCursorPaste
  'spread') match Monaco's own RUNTIME defaults (verified in editorOptions.js: dragAndDrop is registered
  with defaultValue true at line 3132 -- the monaco.d.ts "Defaults to false" comment is stale), so no
  behavior change; they also match VS Code. The adversarial review caught that an earlier draft wrongly
  described dragAndDrop as an enablement based on that stale d.ts comment.
- editor-settings.ts maps all three to Monaco; settings-schema.ts adds two toggles and a select.
- Quality: the editorSettingsToMonaco mapper test covers the defaults and the toggled values;
  typecheck, lint clean; build and full e2e pass. Matrix 5.1 "Drag-drop text, copy/cut whole line,
  multi-paste" Partial to Done. 5.1 now 22/5/0; TOTAL 124/107/97.

## Slice 121: occurrences-highlight setting (done)

Expose Monaco's occurrence highlighting as a setting, completing the document links + highlights row
(catalog 5.2).

- contracts EditorSettings + DEFAULT_SETTINGS gain occurrencesHighlight (off/singleFile/multiFile),
  default singleFile (Monaco's own default, so no behavior change). editor-settings.ts maps it to
  Monaco; settings-schema.ts adds the select.
- Document links already had a custom DocumentLinkProvider; this adds the explicit config for the
  symbol-at-cursor occurrence highlighting (semantic for TS/JS via the worker, word-based otherwise).
- Quality: the editorSettingsToMonaco mapper test covers the default and a scope change; typecheck,
  lint clean; build and full e2e pass. Matrix 5.2 "Document links and highlights" Partial to Done.
  5.2 now 4/10/10; TOTAL 123/108/97.

## Slice 120: F6 region cycling (done)

Add VS Code's F6 focus cycling between the main regions (catalog 5.20 accessibility).

- App: F6 (and Shift+F6 to reverse) in the global keydown handler cycles focus through the activity
  bar, primary sidebar, editor, bottom panel, and status bar. It walks to the next region that has a
  focusable child, SKIPPING empty regions (the adversarial review caught that the first version stalled
  on the PixieStage center and the minimal narration footer in stage/minimal modes, leaving later
  regions unreachable); stops after a full lap if nothing is focusable.
- Quality: one e2e cycles all five regions forward, wraps, and reverses; another switches to minimal
  mode and asserts F6 skips the two empty regions to reach the status bar; typecheck, lint clean; build
  and full e2e pass. Matrix 5.20 "Full keyboard operability with visible focus" evidence updated (F6 plus
  the sash keyboard pane-resize now done; Alt+Z/Alt+H, Ctrl/Cmd+., and a modal focus trap remain) --
  stays Partial, no flip. TOTAL unchanged 122/109/97.

## Slice 119: reset layout resets panel sizes (done)

Make View: Reset Layout also reset the sash-driven panel sizes, completing the row (catalog 5.5).

- App: the view-reset-layout command now sets sidebarWidth to SIDEBAR_DEFAULT, bottomHeight to
  BOTTOM_DEFAULT, and sidebarHidden to false (alongside the existing mode/drawer/zen resets), so a
  user who dragged the sashes or hid the sidebar with Ctrl+B can restore the default layout. The
  adversarial review caught that the first version did not restore Ctrl+B sidebar visibility (so the
  reset sidebarWidth had no visible effect); fixed. (View locations are fixed, nothing else to
  relocate.)
- Quality: an e2e widens the sidebar via the sash, runs Reset Layout, and asserts the width returns to
  the default; typecheck, lint clean; build and full e2e pass. Matrix 5.5 "Reset layout to defaults"
  Partial to Done. 5.5 now 10/12/6; TOTAL 122/109/97.

## Slice 118: column selection setting (done)

Expose Monaco's column-selection mode as a setting (catalog 5.1).

- contracts EditorSettings + DEFAULT_SETTINGS gain columnSelection (default false, Monaco's own
  default, so no behavior change). editor-settings.ts maps it to Monaco; settings-schema.ts adds the
  toggle.
- Box selection via Shift+Alt+drag was already a Monaco standalone default; this adds the explicit
  config the row was missing.
- Quality: the editorSettingsToMonaco mapper test covers the default and the toggle; typecheck, lint
  clean; build and full e2e pass. Matrix 5.1 "Column/box selection" Partial to Done. 5.1 now 21/6/0;
  TOTAL 121/110/97.

## Slice 117: full screen toggle (F11) (done)

Add OS full screen alongside the existing zen mode (catalog 5.5).

- App: a View: Toggle Full Screen command and an F11 keybinding toggle the Fullscreen API
  (document requestFullscreen/exitFullscreen, both rejection-guarded). isFullscreen is tracked from
  the real fullscreenchange event (not just intent) and reflected in the shell's data-fullscreen.
  Works in the browser demo and the Tauri webview; no new dependency.
- Quality: an e2e runs the command to enter and leave fullscreen, asserting data-fullscreen flips
  true then false (Playwright's chromium supports the Fullscreen API); typecheck, lint clean; build
  and full e2e pass. Matrix 5.5 "Full screen / distraction-free" Partial to Done (zen + OS full screen
  via the Fullscreen API). 5.5 now 9/13/6; TOTAL 120/111/97.

## Slice 116: honesty correction -- Emmet over-claim (done)

While scoping an Emmet feature, found that adding the integration package (emmet-monaco-es) is blocked
by the sandbox (untrusted external dependency), and that the matrix over-claimed Emmet: 5.13 row
"Emmet abbreviation expansion and commands" was Partial on the premise "Monaco 0.55.1 ships Emmet."
That is false -- Monaco standalone bundles no Emmet (only an incidental "emmet" token in a DOM
utility; no Emmet actions/providers), EditorPanel does no Emmet registration, and emmet-monaco-es is
not a dependency, so abbreviation expansion does not work.

- Corrected the 5.13 row Partial to Missing (honest downgrade) with accurate evidence, reconciling it
  with 5.2's Emmet row (already Missing). Fixed the 5.13 intro prose that claimed "default Emmet."
- No code change (matrix/docs only); matrix integrity holds. 5.13 now 1/2/2; TOTAL 119/112/97.
- Emmet itself remains a real parity gap, deferred until the emmet-monaco-es dependency can be approved.

## Slice 115: word-based suggestions setting (done)

Make Monaco's word-based completion scope configurable, including across open documents (catalog 5.3).

- contracts EditorSettings + DEFAULT_SETTINGS gain wordBasedSuggestions
  (off / currentDocument / matchingDocuments / allDocuments), default matchingDocuments -- Monaco's
  own default (confirmed in migrateOptions/editorConfigurationSchema), so no behavior change.
- editor-settings.ts maps it straight to Monaco; settings-schema.ts adds the select.
- Quality: the editorSettingsToMonaco mapper test covers the default and a scope change; typecheck,
  lint clean; build and full e2e pass. Matrix 5.3 "Word-based suggestions across open docs" Partial to
  Done (configurable, cross-document via matchingDocuments/allDocuments). 5.3 now 9/3/0; TOTAL 119/113/96.

## Slice 114: select for compare (done)

Add VS Code's Select for Compare / Compare with Selected, diffing two arbitrary files (catalog 5.4).

- App: a compareBase state plus an activeFileSnapshot helper (native draft or demo edited content).
  File: Select for Compare stashes the active file; File: Compare with Selected opens the Monaco diff
  modal (DiffModal already accepts arbitrary original/modified) with base vs the current file.
- Both registered as palette commands and added to the command-registration deps so they stay fresh.
- Quality: an e2e selects the default file, opens another, runs Compare with Selected, and asserts the
  "selected for compare" diff; typecheck, lint clean; build and full e2e pass. Matrix 5.4 "Compare
  feature" evidence updated (Compare with Saved + select-for-compare; folder/whole-workspace compare
  remain) -- stays Partial, no flip. TOTAL unchanged 118/114/96.

## Slice 113: custom theme import (done)

Pair the existing Theme: Export with a Theme: Import, so a pasted theme JSON applies (catalog 5.16).

- lib/theme.ts: parseImportedTheme(json) validates and parses a theme (id/name/appearance plus the
  full color token set, derived at runtime from the default theme so a partial paste errors instead of
  importing as a silent no-op -- a gap the adversarial review caught);
  currentTheme returns settings.customTheme when themeId is the "custom" sentinel, else resolves the
  built-in. Both pure, unit tested (incl. an export -> import round-trip).
- contracts AppSettings + DEFAULT gain customTheme: Theme | null (mergeSettings replaces it
  wholesale). Picking any built-in theme sets a real themeId, making the custom theme inert without
  needing to clear it at the four themeId-set sites.
- components/ThemeImportModal.tsx: paste JSON, Apply (or an inline error); App registers Theme: Import
  and applies via setSettings(themeId 'custom', customTheme). The existing applyTheme effect renders it.
- Quality: theme unit tests (parse, override, round-trip); an e2e imports a theme via the palette and
  asserts html[data-theme]; typecheck, lint clean; build and full e2e pass. Matrix 5.16 "Custom theme
  file import/export" Partial to Done. 5.16 now 18/2/3; TOTAL 118/114/96.

## Slice 112: trim final newlines and consistent on-save (done)

Finish the on-save transforms and apply them on every save path (catalog 5.1).

- on-save.ts gains trimFinalNewlines (collapse extra trailing blank lines to one final newline),
  applied between trim-trailing and insert-final-newline; pure, unit tested.
- contracts EditorSettings + DEFAULT_SETTINGS + settings-schema add the editor.trimFinalNewlines
  toggle (default off, like the other on-save options).
- useWorkspace.save now applies applyOnSave (reading the editor settings) before writing and updates
  the buffer, so Save and Save All trim consistently, not just the editor's Ctrl+S (the EditorPanel
  handler already covered Ctrl+S). Idempotent where both run. (Tab close discards via closeDoc and is
  not a save path.)
- Quality: on-save unit tests cover trimFinalNewlines and the combined transforms; typecheck, lint
  clean; build and full e2e pass. Matrix 5.1 "Trim auto whitespace, insert final newline,
  trimFinalNewlines" Partial to Done. 5.1 now 20/7/0; TOTAL 117/115/96.

## Slice 111: control-character and final-newline rendering settings (done)

Make the last two editor rendering options configurable (catalog 5.1), following the established
settings pattern.

- contracts EditorSettings + DEFAULT_SETTINGS gain renderControlCharacters and renderFinalNewline
  (both default true, matching Monaco's own prior defaults so the current look is preserved).
- editor-settings.ts maps them to Monaco (renderControlCharacters boolean; renderFinalNewline ->
  'on'/'off'); settings-schema.ts adds the two boolean toggles to the Settings UI.
- Quality: the editorSettingsToMonaco mapper test (exhaustive defaults plus a dedicated toggle case)
  covers the mapping; typecheck, lint clean; build and full e2e pass. Matrix 5.1 "Whitespace and
  control char rendering, render final newline" Partial to Done (all three render options now
  configurable). 5.1 now 19/8/0; TOTAL 116/116/96.

## Slice 110: bottom panel sash (done)

Make the bottom panel dock resizable too, completing VS Code's two main sashes (catalog 5.5).

- Sash.tsx now takes an orientation: 'vertical' resizes a width (sidebar), 'horizontal' resizes a
  height (the bottom dock, top edge, drag up to grow). Keyboard maps to the orientation (Left/Right vs
  Up/Down); the ARIA separator reports aria-orientation accordingly.
- lib/sash.ts adds a generic loadSize plus bottom-panel constants and loadBottomHeight (unit tested).
- App tracks bottomHeight (clamped 120-560, persisted) and feeds a --bottom-height var; .app-bottom
  uses it. The horizontal sash renders at the top of the dock.
- Quality: an e2e focuses the bottom sash and arrow-keys it taller, asserting the dock grows; the
  sidebar sash e2e still passes after the orientation refactor. Typecheck, lint clean; build and full
  e2e pass. Matrix 5.5 "Sash resizing (visual splitter)" evidence updated (sidebar + bottom panel both
  resize; editor groups remain) -- stays Partial, no flip. TOTAL unchanged 115/117/96.

## Slice 109: draggable sidebar sash (done)

Make the primary sidebar user-resizable, like VS Code's sashes (catalog 5.5).

- components/Sash.tsx: a reusable splitter exposed as an ARIA separator (role=separator,
  aria-valuenow/min/max). Pointer drag (with pointer capture) or Arrow/Home/End keys report a new
  size via onChange; keyboard-operable so it is accessible and e2e-testable without a mouse. The pure
  math (clampSize, loadSidebarWidth, the min/max/default constants) lives in lib/sash.ts and is unit
  tested.
- App tracks sidebarWidth (clamped 160-480, persisted to localStorage) and feeds it to a
  --sidebar-width CSS var; the companion grid's first track uses it. The sash renders in the gap
  between the sidebar and the editor (companion mode, sidebar shown).
- Quality: an e2e focuses the sash and arrow-keys it wider, asserting the explorer grows; typecheck,
  lint clean; build and full e2e pass. Matrix 5.5 "Sash resizing (visual splitter)" Missing to Partial
  (only the sidebar resizes; bottom panel and editor groups not yet). 5.5 now 8/14/6; TOTAL 115/117/96.

## Slice 108: inline conflict decorations + native conflict bar (done)

Complete the merge-conflict feature: highlight conflicts inline and make accept work in both editors
(catalog 5.4), building on slice 107's detection/resolution.

- EditorPanel decorates each conflict block inline (current/incoming/marker whole-line decorations
  via deltaDecorations, recomputed on content change). Since both the demo and the workspace editor
  use EditorPanel, the highlighting applies in both.
- WorkspaceEditor (native) now renders the MergeConflictBar above the editor and resolves via
  ws.setDraft, so accept actions work natively too (the demo already had the bar in App).
- Decoration ids are tracked per model (a WeakMap keyed on the Monaco model) so switching files (the
  editor swaps cached models) replaces rather than accumulates the highlighting (a leak the
  adversarial review caught; an e2e now guards that the marker count is stable across a round-trip).
- Quality: an e2e opens the conflicted file, asserts the inline .conflict-marker decoration, and
  accepts a side; typecheck, lint clean; build and full e2e pass. Matrix 5.4 "Inline merge-conflict
  decorations and accept actions" Partial to Done (inline decorations + accept in both editors; the
  caveat: accept via a per-file bar not per-conflict CodeLens, and no separate 3-way merge editor).
  5.4 now 6/2/1; TOTAL 115/116/97.

## Slice 107: merge-conflict bar and resolution (done)

Detect git merge conflicts and resolve them from the editor, like VS Code (catalog 5.4).

- lib/conflicts.ts: findConflicts parses the <<<<<<< / ======= / >>>>>>> blocks (ignoring a markdown
  setext underline) and resolveConflict rewrites the file keeping the current, incoming, or both
  sides. Pure, unit tested.
- components/MergeConflictBar.tsx: a bar above the editor that counts the conflicts and offers Accept
  Current / Incoming / Both per conflict; App computes conflicts from the active content and resolves
  via setEditedContents. A demo file (session.config.ts) ships an unresolved conflict.
- Quality: conflicts unit tests (parse + resolve + no-markers-left); an e2e opens the conflict file,
  sees the bar, accepts Current, and the bar disappears. Typecheck, lint clean; build and full e2e
  pass. Matrix 5.4 "Inline merge-conflict decorations and accept actions" Missing to Partial (no
  inline editor decorations/CodeLens, no 3-way merge editor, demo editor only). 5.4 now 5/3/1;
  TOTAL 114/117/97.

## Slice 106: back/forward navigation history (done)

Add VS Code's Go Back / Go Forward (Alt+Left/Right), pairing with slice 105's Go to Definition (catalog 5.6).

- lib/nav-history.ts: a shared back/forward stack of caret positions (recordNav/navBack/navForward,
  bounded to 50); pure, unit tested.
- editor bridge: gotoLine records the position it leaves from (so go-to-line, symbol jumps, the
  outline, and problem jumps all feed the history); runEditorAction records before the navigation
  actions (revealDefinition, references, etc.); a new currentPosition() reads the caret. Go
  Back/Forward call gotoLine with record=false so they do not re-record.
- App: Go Back / Go Forward commands (Alt+Left / Alt+Right, also in the global keydown handler).
- Quality: nav-history unit tests; an e2e jumps via @ then Alt+Left (origin) and Alt+Right (back to
  the symbol); typecheck, lint clean; build and full e2e pass. Matrix 5.6 "Go to definition and
  back/forward stack" Missing to Partial (in-editor jumps only; cross-file not tracked). 5.6 now
  8/3/0 (no Missing left in 5.6); TOTAL 114/116/98.

## Slice 105: code-intelligence commands (Monaco worker) (done)

Expose the TS/JS code-intelligence actions Monaco's bundled worker already provides, and correct the
matrix rows that wrongly said they needed an LSP bridge (catalog 5.2).

- editor-commands.ts: added Go to Definition (F12), Peek Definition (Alt+F12), Go to Type Definition,
  Go to Implementation (Ctrl+F12), Go to References (Shift+F12), Rename Symbol (F2), Quick Fix
  (Ctrl+.). They register through the existing EDITOR_COMMANDS loop and run Monaco actions on the
  active editor; Monaco's TS/JS worker (the same one behind diagnostics and inlay hints) supplies the
  behavior. The keybinding labels are Monaco's real defaults.
- Matrix: three under-stated 5.2 rows moved Missing to Partial (they were marked "needs LSP bridge"
  but the Monaco worker provides them for TS/JS): Go to definition/references, Rename symbol, and
  Code actions/quick fixes. Each gap now says TS/JS-only via the worker; no LSP bridge for other
  languages. The "Find all references results view" row stays Missing (Monaco offers a peek, not a
  docked results panel). The 5.2 intro prose was corrected. 5.2 now 3/11/10; TOTAL 114/115/99.
- Quality: editor-commands unit test asserts the new actions are present; a discoverability e2e finds
  Go to Definition in the palette; typecheck, lint clean; build and full e2e pass.

## Slice 104: hex view true bytes (done)

Make the hex dump exact, completing the binary-read story (image 101, media 103, hex now) (catalog 5.22).

- lib/hex.ts: hexDumpBytes(Uint8Array) is the core (exact for any byte); hexDump(text) now encodes
  UTF-8 first (so non-ASCII shows real bytes, not code units); base64ToBytes decodes the native read.
- HexView/HexTarget carry bytes; the View: Hex command natively reads the file's true bytes
  (fs_read_file_base64 plus base64ToBytes) and in the demo encodes the content as UTF-8.
- Quality: hexDumpBytes (binary + byte 255) and base64ToBytes unit tests, plus the existing hex e2e
  (now correct UTF-8 bytes); typecheck, lint clean; build and full e2e pass. Matrix 5.22 "Hex viewer
  and binary editor" stays Partial (read-only, no byte editing or data inspector) with the
  code-units gap closed. No count change (114/112/102).

## Slice 103: native media playback (done)

Make audio/video playback work in the native app, completing the binary-preview trio with slice
101's image read (catalog 5.22).

- lib/media.ts: mediaMime maps audio/video extensions to MIME types (unit tested).
- App: the Media: Open Player command, natively, reads the file's bytes (fs_read_file_base64 from
  slice 101) and builds a data:<mime>;base64,... URL; the browser demo still uses its stored data URL.
- CSP (tauri.conf.json): added media-src 'self' data: asset: https://asset.localhost, parity with the
  existing img-src, so a data: media URL is permitted in the packaged app (a minimal, parity-driven
  loosening; data: media is the same risk class as the already-allowed data: images).
- Quality: a mediaMime unit test; the existing WAV media e2e covers the MediaPlayer via the data-URL
  path; typecheck, lint clean; build and full e2e pass. Matrix 5.22 "Audio/video media player" stays
  Partial (no playlist, captions, or playback-speed control) with the native-playback gap closed.
  No count change (114/112/102).

## Slice 102: breadcrumb folder dropdowns (done)

Add VS Code's breadcrumb folder pickers: click a folder segment to jump to a sibling (catalog 5.5).

- lib/breadcrumbs.ts: folderChildren derives a folder's direct children (files plus immediate
  subfolders, including ones implied only by a deeper path) from a flat path list, folders first;
  unit tested.
- Breadcrumbs.tsx: folder segments are now buttons that open a dropdown of that folder's contents;
  a file opens it, a subfolder drills the dropdown in. The menu closes on outside-click or Escape.
  App feeds entries from demoFiles (demo) or the flattened workspace tree (native), and onOpen.
- Namespace fix (caught by the adversarial review): crumb paths are root-relative but the workspace
  tree's paths are absolute, so the first cut showed empty dropdowns natively. crumbFolderPath
  re-prepends the root so the menu filters in the entry namespace (demo paths are already relative);
  unit tested in both namespaces.
- Quality: folderChildren and crumbFolderPath unit tests (incl. an absolute-path case) and an e2e
  (click the src crumb, pick App.tsx, the trail updates); typecheck, lint clean; build and full e2e
  pass. Matrix 5.5 "Breadcrumbs / path navigation" Partial to Done (Done crossed to 114; 5.5 now 8/13/7).

## Slice 101: native image preview (binary file read) (done)

Make raster image preview work in the native app, not just the browser demo (catalog 5.22).

- Rust: fs_read_file_base64 reads a file's raw bytes as standard base64 (the text read,
  read_to_string, rejects binary). Added the base64 crate; cargo tests cover a non-UTF-8 blob and a
  missing file. Registered in lib.rs; tauri.ts exposes readFileBase64.
- App: the Image: Open Preview command, natively, reads the file's bytes and builds a
  data:<mime>;base64,... URL (rasterImageMime maps the extension; the CSP already allows data: and
  asset: for img-src). The browser demo still uses its stored data URL.
- Quality: cargo test (19), a rasterImageMime unit test, typecheck and lint clean; build and full
  e2e pass (the existing SVG and PNG preview e2e cover the data-URL path). Matrix 5.22 "Image
  preview (inline plus viewer)" Partial to Done (Done crossed to 113; 5.22 now 4/3/3). The base64
  read is reusable for native media and hex later (media also needs a CSP media-src entry).

## Slice 100: toggle the bottom panel (Ctrl+J) (done)

Add VS Code's Toggle Panel shortcut, the natural pair to slice 99's Ctrl+B (catalog 5.5).

- App remembers the last non-hidden bottom panel in a ref; the global keydown handler and a
  View: Toggle Panel command (Ctrl/Cmd+J) toggle the bottom panel between hidden and the last panel
  (defaulting to Problems). The bottom-panel drawer already collapses cleanly on 'none', so no grid
  surgery is needed (unlike the sidebar). The terminal lives in the separate companion footer, so
  this toggles the problems/output/search/scm/outline drawer, not the terminal.
- Quality: an e2e presses Ctrl+J and asserts the Problems region shows then hides; typecheck, lint
  clean; build and full e2e pass. Matrix 5.5 "Show/hide individual views independently" stays
  Partial (right-side companion/timeline and the terminal footer remain mode-coupled) with the
  sidebar/panel toggles noted. No count change (112/114/102).

## Slice 99: toggle the primary sidebar (Ctrl+B) (done)

Add VS Code's most-used layout shortcut: hide and show the primary (explorer) sidebar (catalog 5.5).

- App gains a sidebarHidden state; the explorer block renders only when showExplorer && !sidebarHidden.
  The global keydown handler toggles it on Ctrl/Cmd+B (mirroring the Ctrl+, settings case), and a
  View: Toggle Primary Sidebar command (keybinding Ctrl+B) toggles it from the palette.
- The shell carries data-sidebar-hidden; in companion mode (whose grid has a fixed 220px explorer
  track) a CSS rule collapses that track when hidden so the editor reclaims the space instead of
  staying pinned to 220px (a layout regression the adversarial review caught; the e2e now asserts
  the editor width grows on hide).
- Quality: an e2e presses Ctrl+B and asserts the Files navigation hides/shows and the editor
  reclaims the width; typecheck, lint clean; build and full e2e pass. Matrix 5.5 "Primary and
  secondary sidebars" stays Partial (the
  secondary sidebar still cannot hide independently and views cannot move between sidebars) with the
  primary-sidebar-hide gap closed. No count change (112/114/102).

## Slice 98: format on save, paste, and type (done)

Add the VS Code formatting toggles on top of the existing Format Document/Selection commands
(catalog 5.2).

- EditorSettings (contract) gains formatOnSave, formatOnPaste, formatOnType (default off);
  editorSettingsToMonaco maps formatOnPaste/formatOnType to Monaco's native options (so they apply
  via the editor's options spread); the EditorPanel save handler runs Format Document before
  trim/final-newline when formatOnSave is on. All three are exposed in the Settings panel.
- Quality: the mapper unit test covers formatOnPaste/formatOnType; typecheck, lint clean; build and
  full e2e pass. Matrix 5.2 "Document and range formatting (on save/paste/type)" stays Partial with
  the on-save/paste/type gap closed; the remaining gap is external formatter providers (Prettier or
  LSP via extensions, tracked in 5.17). No count change (112/114/102). Built-in formatters cover the
  bundled languages only, so an injected-content format-on-save e2e is brittle (Monaco auto-close)
  and intentionally omitted; the toggle wiring is covered by the mapper test and manual reasoning.

## Slice 97: outline follows the cursor (done)

Make the Outline view highlight and track the symbol containing the caret, like VS Code (catalog 5.5).

- OutlinePanel gains an activeLine prop; it marks the last symbol that starts at or before the
  caret line with outline__item--active and aria-current, and App feeds it editorStatus.line so it
  updates live as the cursor moves. A CSS rule gives the active entry an accent bar.
- Corrected stale matrix claims: the Outline view already rendered code symbols (not "Markdown
  only"), and the 5.5 section intro listed the outline view and activity-bar badges as
  unimplemented though both ship.
- Quality: an e2e opens the Outline, moves the caret into LoginForm via :5, and asserts the entry
  becomes aria-current; typecheck, lint clean; build and full e2e pass. Matrix 5.5 "Outline /
  Document Symbol view" Partial to Done (the view's features are complete; language coverage of the
  symbol source stays tracked in 5.3). Done crossed to 112; 5.5 now 7/14/7.

## Slice 96: workspace symbol (#) jumps to the line (done)

Make # workspace symbol search jump to the exact symbol, not just open the file (catalog 5.6),
completing the symbol-navigation story started by slice 95's @.

- CommandPalette # mode calls a new onOpenSymbol(file, line) instead of just onOpenFile.
- App's openSymbol jumps immediately for same-file targets, and for cross-file targets stashes
  a revealTarget and lets EditorPanel reveal the line once the new model is shown. The new
  EditorPanel revealLine prop reveals in an effect that runs after the child Editor swaps the
  model on a path change, so the jump is race-free (no model-swap race). The reveal is one-shot:
  EditorPanel calls onRevealed and App clears revealTarget, so a later normal re-open of that file
  does not re-jump or steal focus (caught by the adversarial review).
- Quality: an e2e types #isExpired and asserts session.ts opens at line 7; typecheck, lint clean;
  build and full e2e pass. Matrix 5.6 "Workspace symbols search with #" stays Partial (the index
  is still built from demo file contents only) with the jump gap closed. No count change (111/115/102).

## Slice 95: inline Go to Symbol with @ (done)

Make the palette's @ Go to Symbol list the active file's symbols inline and jump to them,
instead of handing off to Monaco's separate picker (catalog 5.6).

- CommandPalette gains an editorSymbols prop; in @ mode it lists the active file's outline
  symbols (outlineSymbols over markdown headings and top-level JS/TS/Rust declarations) filtered
  by the query, each row jumping to the symbol's line via onGotoLine; a trailing "Go to Symbol in
  Editor" row still hands off to Monaco's full quickOutline for nested symbols and other languages.
- App computes editorSymbols for the open file and passes it through. The breadcrumb symbol click
  keeps the rich Monaco path, so nothing is lost.
- Quality: an e2e types @LoginForm and asserts the editor jumps to line 4; typecheck, lint clean;
  build and full e2e pass. Matrix 5.6 "Symbol navigation in current file with @" Partial to Done
  (Done crossed to 111; 5.6 now 8/2/1).

## Slice 94: clickable status bar (EOL picker and indentation) (done)

Make the status bar fully interactive like VS Code, building on the slice 93 language picker.

- **EOL picker**: the editor bridge gains registerEolSetter / setEditorEol; EditorPanel
  registers a live model.pushEOL setter. The status-bar EOL item is clickable and opens a
  Change End of Line picker (LF / CRLF) that converts the line endings live.
- **Indentation**: the status-bar indentation item is clickable and opens the Convert
  Indentation actions.
- **Quality**: bridge unit tests for setEditorEol (happy path, no-op, clear); an e2e clicks the
  EOL item and converts the file to CRLF; typecheck, lint clean; build and full e2e pass.
- Matrix: 5.1 EOL and 5.5 status-bar rows stay Partial (no platform-default EOL; no encoding
  picker) with narrowed gaps. Honest: no count change, real interactivity gain (110/116/102).

## Slice 93: language mode switcher and content detection (done)

Make the editor's language explicit and switchable, the way VS Code's status bar is (catalog 5.2).

- **Detection** (`lib/languages.ts`): `detectLanguageFromContent` reads a shebang or an
  opening marker (php/xml/html) for files whose extension does not resolve a language;
  `SELECTABLE_LANGUAGES` and `languageLabel` (consolidated from App) back the picker. Unit tested.
- **Live switch**: the editor bridge gains `registerLanguageSetter`/`setEditorLanguage`;
  EditorPanel registers a Monaco `setModelLanguage` setter and now publishes language changes.
  Clicking the status-bar language item opens a Change Language Mode picker (one command per
  language) that switches the model language live.
- **Quality**: unit tests; an e2e clicks the status-bar language item and switches the file to
  JSON; typecheck, lint clean; renderer build succeeds. Matrix 5.2 "Language detection and manual
  mode switch" moved Partial to Done (Done crossed to 110; 5.2 now 3/8/13).

## Slice 92: hsl and named color decorators (done)

Complete the editor color decorators (catalog 5.2).

- **Detection** (`lib/colors.ts`): `findColors` now also recognizes `hsl()/hsla()` (with an
  HSL-to-RGB conversion) and the full set of CSS named colors. Named colors are opt-in via
  `findColors(text, { includeNamed })` and matched on word boundaries. Unit tested.
- **Scoping** (`monaco-setup.ts`): named colors are enabled only for CSS-family languages
  (css/scss/less/html), so a plain identifier like `red` in JS/TS is never decorated.
- **Quality**: unit tests (hsl, named on/off, word-boundary, transparent); typecheck, lint
  clean (no contracts change); the renderer build succeeds; e2e unaffected (the Monaco color
  UI is not browser-e2e-able, like the original color slice). Matrix 5.2 color-decorators row
  moved Partial to Done (Done crossed to 109; 5.2 now 2/9/13).

## Slice 91: image viewer pan and rotate (done)

Complete the SVG/image viewer with pan and rotate (catalog 5.22).

- **Transform** (`lib/preview.ts`): `ImageView` plus pure `imageTransform` (pan, then zoom,
  then rotate), `nextRotation` (quarter-turn, wraps), and `RESET_VIEW`. Unit tested.
- **Viewer** (`ImagePreview.tsx`): a Rotate button, drag-to-pan on the body, and a Reset that
  returns to the neutral view; the img uses imageTransform.
- **Quality**: unit tests (imageTransform/nextRotation); the raster e2e now clicks Rotate and
  Reset and asserts the transform; typecheck, lint clean (no contracts change); build succeeds.
  Matrix 5.22 "SVG viewer (zoom/pan)" moved Partial to Done (Done crossed to 108; 5.22 now 3/4/3).

## Slice 90: compound tasks and dependencies (done)

Run a task's dependency chain before it (catalog 5.11).

- **Parsing** (`lib/tasks.ts`): `parseTasksJson` reads `dependsOn` (a label string or an array
  of labels) into `NpmTask.dependsOn`.
- **Resolution** (`lib/tasks.ts`): new pure `resolveTaskChain(tasks, label)` flattens transitive
  dependencies deps-first, de-duplicated, with cycle safety; unit tested.
- **Run** (`App.tsx`): `runTask` resolves the chain and runs it as one sequential command (joined
  with the shell and-operator), substituting variables per command.
- **Quality**: unit tests (dependsOn parsing + resolveTaskChain order/dedup/cycle/unknown);
  typecheck, lint clean (no contracts change); the renderer build succeeds; e2e unaffected.
  Matrix 5.11 compound-tasks row moved Missing to Partial (5.11 now 0/8/2).

## Slice 89: folding and sticky scroll editor settings (done)

Make the last advanced editor surfaces explicit and configurable (catalog 5.1).

- **Settings**: `folding` and `stickyScroll` join EditorSettings and DEFAULT_SETTINGS (both
  default true, matching Monaco), map through editorSettingsToMonaco (sticky scroll as
  stickyScroll.enabled), and appear in the Settings panel.
- **Quality**: editorSettingsToMonaco unit tests updated (defaults plus a focused mapping
  test); schema exposure tested; typecheck, lint, build, build:packages clean; e2e unaffected.
  Matrix 5.1 row "Line numbers, folding, minimap, breadcrumbs, sticky scroll" moved Partial
  to Done (line numbers, minimap, folding, sticky scroll are settings; breadcrumbs is a
  component). Done crossed to 107; 5.1 now 18/9/0.

## Slice 88: outline view for code symbols (done)

Broaden the Outline view beyond Markdown (catalog 5.3); the row stays Partial.

- **Source** (`lib/workspace-symbols.ts`): a new pure `outlineSymbols(path, content)` returns
  Markdown headings (with level) for .md and flat top-level code declarations otherwise;
  `codeSymbols(text, rust)` gained an opt-in Rust matcher (fn/struct/trait/impl/mod/union/
  enum/type/const/static) applied only to .rs files, so JS/TS keywords like `static` are not
  mis-captured. Unit tested.
- **Panel** (`OutlinePanel.tsx`): renders `outlineSymbols` for any active file; clicking a
  symbol reveals its line. Empty state distinguishes no-symbols from no-file-open.
- **Honesty**: the row stays Partial (the adversarial review flagged a Done flip as an
  overclaim: JSON/CSS/HTML/SCSS/LESS/YAML/TOML still get no outline). This slice broadens
  coverage to JS/TS/Rust; the matrix counts are unchanged.
- **Quality**: unit tests, typecheck, lint clean (no contracts change), the renderer build
  succeeds, and an e2e opens a TS file and asserts its component appears in the outline.

## Slice 87: complete indentation support (done)

Close out the editor's indentation capability (catalog 5.1).

- **Settings**: `detectIndentation` and `indentGuides` join EditorSettings and
  DEFAULT_SETTINGS, map through editorSettingsToMonaco (the latter as guides.indentation),
  and appear in the Settings panel. tabSize and insertSpaces already existed.
- **Commands**: Convert Indentation to Spaces and Convert Indentation to Tabs join
  EDITOR_COMMANDS, running Monaco's indentationToSpaces/indentationToTabs on the active editor.
- **Quality**: editorSettingsToMonaco unit tests updated (defaults plus a focused mapping
  test); schema exposure tested; typecheck, lint, build, build:packages clean; e2e unaffected.
  Matrix 5.1 indentation row moved Partial to Done (Done crossed to 106; 5.1 now 17/10/0).

## Slice 86: explicit cursor and scrolling editor settings (done)

Make the editor's cursor and scrolling behaviors explicit and configurable (catalog 5.1).

- **Settings**: `cursorBlinking`, `cursorSmoothCaretAnimation`, `cursorSurroundingLines`,
  `smoothScrolling`, `fastScrollSensitivity`, and `scrollBeyondLastLine` join EditorSettings
  and DEFAULT_SETTINGS, map through editorSettingsToMonaco, and appear in the Settings panel.
  EditorPanel's hardcoded scrollBeyondLastLine/smoothScrolling/cursorBlinking were removed
  (the mapper is now the single source of truth; defaults preserve prior behavior).
- **Quality**: editorSettingsToMonaco unit tests updated (defaults plus a focused mapping
  test); schema exposure tested; typecheck, lint, build, build:packages clean; e2e unaffected.
  Matrix 5.1 rows cursor (styles/blink/smooth caret/surrounding) and scrolling (smooth/fast/
  beyond-last-line/wheel-zoom) moved Partial to Done (Done crossed to 105).

## Slice 85: explicit bracket and auto-close editor settings (done)

Make three Monaco-default behaviors explicit and configurable (catalog 5.1).

- **Settings**: `bracketPairColorization`, `autoClosingBrackets`, `autoClosingQuotes`,
  `autoSurround`, and `matchBrackets` join EditorSettings and DEFAULT_SETTINGS, map to
  Monaco through editorSettingsToMonaco, and appear in the Settings panel via the schema.
- **Quality**: editorSettingsToMonaco unit tests updated (defaults plus a focused
  mapping test); schema exposure tested; typecheck, lint, build clean; e2e unaffected.
  Matrix 5.1 rows auto-closing brackets/quotes, auto-surround, and bracket
  matching/colorization moved Partial to Done (Done crossed to 103).

## Slice 84: audio and video media player (done)

A media player for audio and video files (catalog 5.22).

- **Detector** (`lib/media.ts`): `isAudioPath`, `isVideoPath`, `isMediaPath`, and
  `mediaKind` classify by extension. Pure and unit tested.
- **Player** (`MediaPlayer.tsx`): renders native `<audio>` or `<video>` controls and
  shows a message on load failure; Media: Open Player opens the active media file. A
  short demo WAV (`assets/chime.wav`) drives the browser e2e. Native playback is gated
  with a notice (the file read is text-only), so media is browser-demo-only for now.
- **Quality**: unit tests, typecheck, lint clean (no Rust change), the renderer build
  succeeds, and the e2e asserts the audio element and controls. Matrix 5.22
  audio/video row moved Missing to Partial.

## Slice 83: raster image preview with dimensions and zoom (done)

Extend the image viewer beyond SVG (catalog 5.22).

- **Detector** (`lib/preview.ts`): `isRasterImagePath` and `isImagePath` add raster
  formats; `clampZoom` and `zoomPercent` back the zoom control. Pure and unit tested.
- **Viewer** (`ImagePreview.tsx`): reports natural pixel dimensions on load, zooms
  in and out within a clamped range, and shows a message if a source fails to decode.
  A 16 by 16 demo PNG (`assets/pixie.png`) drives the browser e2e. Native raster
  preview is gated with a notice for now: the file read is text-only (read_to_string
  rejects binary), so raster is browser-demo-only until a binary read lands.
- **Quality**: unit tests, typecheck, lint clean (no Rust change), the renderer build
  succeeds, and the e2e asserts dimensions and a zoom step. Matrix 5.22 image-preview
  row moved Missing to Partial.

## Slice 82: per-key keybinding conflict detection (done)

Surface when two commands bind the same gesture (catalog 5.15).

- **Detector** (`keybinding-conflicts.ts`): `normalizeKeybinding` collapses case,
  modifier order, and chord spacing; `findKeybindingConflicts` groups commands
  sharing a gesture; `conflictingKeys` flags rows. Pure and unit tested.
- **UI** (`KeyboardShortcuts.tsx`): a conflict summary region (role status when
  clean, role alert when not) plus a per-row conflict badge. The real registry is
  conflict free, so the view reports "No keybinding conflicts."
- **Quality**: unit tests, typecheck, lint clean (no Rust change), the renderer
  build succeeds, and the e2e asserts the conflict summary. Matrix 5.15 per-key
  conflict-detection row moved to Partial.

## Slice 81: narration log panel (done)

An accessible narration history (catalog 5.20).

- **Panel** (`NarrationLog.tsx`, role='log'): View: Narration Log opens a bottom-drawer
  log of the narration captions, also in the View menu.
- **Quality**: 400 unit tests, typecheck, lint clean (no Rust change), the renderer build
  succeeds, and 61 Playwright e2e pass (the new one opens the log region). Matrix 5.20
  narration-log row moved to Partial.

## Slice 80: auto-reveal active file (done)

Reveal the open file in the explorer (catalog 5.7).

- **Helper** (`lib/reveal.ts` ancestorsOf): the ancestor folders of a path. Unit tested.
- **Explorer**: when the open path changes, ExplorerPanel expands those ancestors so the
  file is visible.
- **Quality**: 400 unit tests (398 plus 2), typecheck, lint clean (no Rust change), the
  renderer build succeeds, and 60 Playwright e2e pass (the new one collapses a folder, opens
  a file inside via quick-open, and sees it re-revealed). Matrix 5.7 auto-reveal row moved
  to Partial.

## Slice 79: theme export (done)

Export the active theme as JSON (catalog 5.16).

- **Helpers** (`lib/theme.ts`): currentTheme resolves the active theme; exportTheme
  serializes it. applyTheme now reuses currentTheme. Unit tested.
- **Modal** (`ThemeExportModal.tsx`): Theme: Export shows the JSON with Copy.
- **Quality**: 398 unit tests (396 plus 2), typecheck, lint clean (no Rust change), the
  renderer build succeeds, and 59 Playwright e2e pass (the new one opens the export and
  sees the theme JSON). Matrix 5.16 theme-import/export row moved to Partial.

## Slice 78: git stash apply, drop, and a stash list view (done)

Round out stash support (catalog 5.9; the row moved to Done; Done crossed 100).

- **Core** (`git.rs`): git_stash_apply and git_stash_drop by index (cargo tested, 17 cargo
  tests now).
- **UI** (`GitStashModal.tsx`): Git: Stashes lists the stashes (parseStashList in lib/stash.ts,
  unit tested) with Apply and Drop and a Stash Current Changes button; opens without a repo
  and shows a note, so it is browser-e2e-able.
- **Quality**: 396 unit tests, 17 cargo tests, typecheck, lint clean, the renderer build
  succeeds, and 58 Playwright e2e pass (the new one opens the modal with no folder). Matrix
  5.9 stash row moved to Done.

## Slice 77: open editors view (done)

An Open Editors section in the Explorer (catalog 5.5).

- **View**: ExplorerPanel renders an Open Editors section above the tree listing the open
  editor(s) and highlighting the active one; clicking switches.
- **Quality**: 394 unit tests, typecheck, lint clean (no Rust change), the renderer build
  succeeds, and 57 Playwright e2e pass (the new one sees the open file in the section).
  Matrix 5.5 open-editors row moved to Partial.

## Slice 76: workspace symbol search (done)

Search symbols across files with # (catalog 5.6).

- **Index** (`lib/workspace-symbols.ts`): buildWorkspaceSymbols extracts markdown headings
  and top-level code declarations (codeSymbols, no-indent regex so nested locals are
  skipped); filterWorkspaceSymbols matches by name. 7 unit tests.
- **Palette**: parsePaletteInput routes # to a wsymbols mode; CommandPalette lists matching
  symbols and opens the file. App builds the index from the demo file contents.
- **Quality**: 394 unit tests (389 plus 5, after updating the core-shell reserved-# test),
  typecheck, lint clean (no Rust change), the renderer build succeeds, and 56 Playwright
  e2e pass (the new one searches #LoginForm). Matrix 5.6 workspace-symbols row moved to
  Partial.

## Slice 75: terminal exit code (done)

Show the shell exit code (catalog 5.10).

- **Message** (`lib/terminal-exit.ts` exitMessage and exitIsFailure): the terminal now
  writes Process completed, Process exited with code N, or Process exited, colored red on
  a nonzero code. 4 unit tests.
- **Quality**: 389 unit tests (385 plus 4), typecheck, lint clean (no Rust change), the
  renderer build succeeds, and 55 Playwright e2e pass (the exit path is native, so the
  pure tests cover it). Matrix 5.10 shell-integration row moved to Partial.

## Slice 74: diff change counter (done)

A change counter in the diff modal (catalog 5.4; the row moved to Done).

- **Counter**: DiffView reports the number of changed regions from Monaco's getLineChanges
  (via onChangeCount, refreshed on the diff-updated event); the DiffModal chrome shows it
  (No changes, or N changes).
- **Quality**: 385 unit tests, typecheck, lint clean (no Rust change), the renderer build
  succeeds, and 55 Playwright e2e pass (the compare-with-saved e2e now also asserts the
  counter). Matrix 5.4 change-navigation-and-counter row moved to Done.

## Slice 73: editor font family and ligatures settings (done)

Customize the editor font (catalog 5.16; two rows moved to Done).

- **Settings**: editor.fontFamily (a select of monospace font stacks) and
  editor.fontLigatures (a toggle) map to Monaco's fontFamily and fontLigatures, replacing
  the values EditorPanel hardcoded.
- **Quality**: 385 unit tests (the editorSettingsToMonaco mapper test covers the new
  fields), typecheck, lint clean (no Rust change), the renderer build succeeds, and 55
  Playwright e2e pass. Matrix 5.16 font-family and ligatures rows moved to Done.

## Slice 72: output channels (done)

Multiple output channels (catalog 5.21; the row moved to Done).

- **Channels** (`output-log.ts`): a log entry carries an optional channel; logChannels
  and filterLogByChannel join the existing level filter. Unit tested.
- **Routing**: general logs go to Log, window lifecycle to Window, task runs to Tasks.
- **Panel**: OutputPanel gained a channel selector alongside the level filter.
- **Quality**: 384 unit tests (383 plus 1, with the existing append test updated for the
  channel field), typecheck, lint clean (no Rust change), the renderer build succeeds, and
  55 Playwright e2e pass (the new one switches from Log to Window). Matrix 5.21
  output-channels row moved to Done.

## Slice 71: problems panel filtering (done)

Filter the Problems panel (catalog 5.21; the row moved to Done).

- **Filter** (`lib/problem-filter.ts` filterDiagnostics): by a text query (message or file)
  and by severity toggles. 4 unit tests.
- **Panel**: ProblemsPanel gained a filter input and Error, Warning, and Info toggles; the
  count reflects the filtered set, with a distinct empty state when a filter hides all.
- **Quality**: 383 unit tests (379 plus 4), typecheck, lint clean (no Rust change), the
  renderer build succeeds, and 54 Playwright e2e pass (the new one waits for a real
  diagnostic then filters to the empty state). Matrix 5.21 problems-filter row moved to Done.

## Slice 70: git remotes (done)

Manage remotes (catalog 5.9).

- **Core** (`git.rs`): git_remotes (parses git remote -v, one entry per name),
  git_remote_add, and git_remote_remove. Cargo tested (16 cargo tests now).
- **UI** (`GitRemotesModal.tsx`): Git: Remotes lists, adds, and removes remotes; like the
  tags modal it opens without a repo and shows a note, so it is browser-e2e-able.
- **Quality**: 379 unit tests, 16 cargo tests, typecheck, lint clean, the renderer build
  succeeds, and 53 Playwright e2e pass (the new one opens the modal with no folder). Matrix
  5.9 remotes row moved to Partial.

## Slice 69: accessibility help dialog (done)

Keyboard and screen-reader help (catalog 5.20).

- **Dialog** (`AccessibilityHelp.tsx`, aria-modal): Help: Accessibility Help lists how to
  drive vsclaude from the keyboard and which accessibility affordances exist
  (ACCESSIBILITY_HELP in lib/a11y-help.ts, unit tested). It is in the Help menu too.
- **Quality**: 379 unit tests (377 plus 2), typecheck, lint clean (no Rust change), the
  renderer build succeeds, and 52 Playwright e2e pass (the new one opens it from the Help
  menu). Matrix 5.20 accessibility-help row moved to Partial.

## Slice 68: snippet browser and insert command (done)

Insert built-in snippets (catalog 5.13).

- **Browser** (`SnippetsModal.tsx`): Snippets: Insert Snippet lists the built-in snippets
  (allSnippets in lib/snippets.ts, unit tested); choosing one inserts it at the cursor via
  insertSnippet (editor-bridge runs the editor's insert-snippet action).
- **Quality**: 377 unit tests (376 plus 1), typecheck, lint clean (no Rust change), the
  renderer build succeeds, and 51 Playwright e2e pass (the new one opens the browser and
  sees the snippets). Matrix 5.13 snippet-management row moved to Partial.

## Slice 67: process info panel (done)

Runtime metrics (catalog 5.23).

- **Helper** (`lib/process-info.ts`): formatBytes (unit tested) and collectProcessInfo,
  which reads the JS heap (where exposed), CPU cores, live DOM node count, and the IPC
  protocol version.
- **Panel** (`ProcessInfoModal.tsx`): Developer: Process Info shows the metrics with a
  Refresh button.
- **Quality**: 376 unit tests (374 plus 2), typecheck, lint clean (no Rust change), the
  renderer build succeeds, and 50 Playwright e2e pass (the new one opens the panel and
  sees the metrics). Matrix 5.23 process-explorer row moved to Partial.

## Slice 66: diff editor settings and a matrix roll-up reconciliation (done)

Diff settings (catalog 5.4; the row moved to Done).

- **Settings**: editor.diffAlgorithm (legacy or advanced) and editor.diffMaxComputationTime
  join the existing diff ignore-trailing-whitespace setting; DiffView passes all three to
  the Monaco diff editor. Settings unit tested.
- **Matrix fix**: a sweep found the section roll-ups had drifted from their own capability
  rows (6 sections off by one). Reconciled every roll-up to the actual rows; the true item
  count is 333 (the prior 329 was an accumulated undercount of 4 Missing items). A new
  verification sums each section's rows and compares them to its roll-up, so this cannot
  recur silently.
- **Quality**: 374 unit tests (a new settings-schema test for the diff settings),
  typecheck, lint clean (no Rust change), the renderer build succeeds, and 49 Playwright
  e2e pass. Matrix 5.4 diff-settings row moved to Done; totals now Done 94, Partial 118,
  Missing 116, Not planned 5 (333).

## Slice 65: minimap side and size settings (done)

Configure the minimap (catalog 5.3; the row moved to Done).

- **Settings**: editor.minimapSide (left/right) and editor.minimapSize (proportional/
  fill/fit) join the existing minimap toggle, mapping to Monaco's minimap side and size.
- **Quality**: 373 unit tests (the editorSettingsToMonaco mapper test covers the new
  shape), typecheck, lint clean (no Rust change), the renderer build succeeds, and 49
  Playwright e2e pass. Matrix 5.3 minimap row moved to Done.

## Slice 64: Edit menu and editing commands (done)

Undo/redo and clipboard commands (catalog 5.1; section 5.1 now has no Missing rows).

- **Commands**: Edit: Undo, Redo, Cut, Copy, Paste, Find, and Replace run Monaco's
  editor actions on the active editor.
- **Menu**: an Edit menu surfaces them in the menu bar.
- **Quality**: 372 unit tests (the menu-structure test updated for the Edit menu),
  typecheck, lint clean (no Rust change), the renderer build succeeds, and 49 Playwright
  e2e pass (the new one opens the Edit menu and sees Undo and Redo). Matrix 5.1
  undo/redo row moved to Partial, clearing the last 5.1 Missing.

## Slice 63: a menu bar (done)

File, View, Go, and Help menus (catalog 5.5).

- **Data** (`lib/menus.ts` MENU_BAR): each menu lists items that run a registry command
  by id. Unit tested (structure and unique commands).
- **Component** (`MenuBar.tsx`): dropdown menus in the header; choosing an item runs the
  command; click-away or Escape closes.
- **Quality**: 372 unit tests (369 plus 3), typecheck, lint clean (no Rust change), the
  renderer build succeeds, and 48 Playwright e2e pass (the new one opens Release Notes
  from the Help menu). Matrix 5.5 title-bar/menu-bar row moved to Partial.

## Slice 62: TS and JS inlay hints (done)

Inline parameter-name and type hints (catalog 5.2).

- **Config** (`lib/inlay-hints.ts` TS_INLAY_HINTS): parameter names, parameter and
  variable types, and return types. Unit tested.
- **Wiring**: monaco-setup applies it to the TS and JS workers via setInlayHintsOptions
  (with an ambient declare for the typescript contribution); EditorPanel turns on the
  inlayHints editor option.
- **Quality**: 369 unit tests (367 plus 2), typecheck, lint clean (no Rust change), the
  renderer build succeeds, and 47 Playwright e2e pass. Matrix 5.2 inlay-hints row moved
  to Partial.

## Slice 61: notification toasts and a status-bar bell (done)

Completes the notification UX (catalog 5.21; the row moved to Done).

- **Toast** (`NotificationToast.tsx`): a transient toast for the newest notification,
  auto-dismissing after five seconds.
- **Bell**: a status-bar item shows the notification count and opens the center.
- **Quality**: 367 unit tests, typecheck, lint clean (no Rust change), the renderer
  build succeeds, and 47 Playwright e2e pass (the new one posts a notification, sees
  the toast, and opens the center from the bell). Matrix 5.21 notification-center row
  moved to Done.

## Slice 60: hex viewer (done)

A hex dump of the active file (catalog 5.22).

- **Dump** (`lib/hex.ts` hexDump): offset, hex bytes, and a printable-ASCII gutter,
  16 bytes per row. 4 unit tests.
- **View** (`HexView.tsx`): View: Hex shows the active file as a hex dump.
- **Quality**: 367 unit tests (363 plus 4), typecheck, lint clean (no Rust change), the
  renderer build succeeds, and 46 Playwright e2e pass (the new one opens the hex view of
  the demo README). Matrix 5.22 hex-viewer row moved to Partial.

## Slice 59: @ symbol navigation in the palette (done)

Go to Symbol via @ (catalog 5.6).

- **Parser** (`core-shell/quick-pick.ts`): parsePaletteInput now routes a leading @ to
  a symbols mode (unit tested).
- **Palette**: in symbols mode the palette offers Go to Symbol in Editor, which runs
  Monaco's quickOutline (using the markdown symbol provider and the TS or JS worker).
- **Quality**: 363 unit tests (after updating the core-shell reserved-prefix test for @),
  typecheck, lint clean (no Rust change), the renderer build succeeds, and 45 Playwright
  e2e pass (the new one types @ and sees the symbol entry). Matrix 5.6 @ row moved to
  Partial.

## Slice 58: files.exclude noise filtering (done)

Hide noise directories (catalog 5.7).

- **Helper** (`lib/excludes.ts` isExcludedPath): hides paths inside node_modules, .git,
  dist, build, coverage, and .next by segment match. 2 unit tests.
- **Wiring**: the explorer and quick-open filter excluded paths; a demo node_modules
  entry shows it working.
- **Quality**: 362 unit tests (360 plus 2), typecheck, lint clean (no Rust change), the
  renderer build succeeds, and 44 Playwright e2e pass (the new one confirms the explorer
  hides node_modules). Matrix 5.7 files.exclude row moved to Partial.

## Slice 57: task groups and a default build task (done)

Build and test groups (catalog 5.11).

- **Groups** (`lib/tasks.ts`): tasks carry a build or test group; parseTasksJson reads
  the tasks.json group (string or object), and classifyTaskGroup classifies script
  names. Unit tested.
- **Command**: Tasks: Run Build Task runs the first build-group task, or reports when
  there is none.
- **Quality**: 360 unit tests (358 plus 2, after updating the existing detectNpmTasks
  test for the new group), typecheck, lint clean (no Rust change), the renderer build
  succeeds, and 43 Playwright e2e pass (the new one runs build with no task and reads the
  notification). Matrix 5.11 task-groups row moved to Partial.

## Slice 56: task variable substitution (done)

Variables in task commands (catalog 5.11).

- **Substitution** (`lib/variables.ts` substituteVariables): resolves ${workspaceFolder},
  ${file}, ${fileBasename}, and ${env:NAME}, leaving an unknown variable as-is. 4 unit tests.
- **Wiring**: the Run Task command substitutes the variables before running, using the
  open folder and active file.
- **Quality**: 358 unit tests (354 plus 4), typecheck, lint clean (no Rust change), the
  renderer build succeeds, and 42 Playwright e2e pass (tasks are native-gated, so the
  pure substitution unit tests cover it). Matrix 5.11 variable-substitution row moved to
  Partial.

## Slice 55: reset layout command (done)

Restore the default layout (catalog 5.5).

- **Command**: View: Reset Layout restores the default presentation mode, closes the
  bottom drawer, and exits zen mode.
- **Quality**: 354 unit tests, typecheck, lint clean (no Rust change), the renderer
  build succeeds, and 42 Playwright e2e pass (the new one opens a drawer then resets).
  Matrix 5.5 reset-layout row moved to Partial; two stale 5.20 evidence notes (uiScale
  now exists) refreshed.

## Slice 54: settings JSON editor (done)

Edit settings as JSON (catalog 5.14).

- **Modal** (`SettingsJsonModal.tsx`): Settings: Open JSON seeds a textarea from the
  current settings (serializeSettings); Apply validates the JSON (invalid is reported,
  not applied) and merges through loadSettings; Copy exports it. The round-trip is unit
  tested (reusing the persistence package's serialize and load).
- **Quality**: 354 unit tests (351 plus 3), typecheck, lint clean (no Rust change), the
  renderer build succeeds, and 41 Playwright e2e pass (the new one opens the editor and
  confirms it holds the current settings). Matrix 5.14 settings-JSON row moved to Partial.

## Slice 53: trim trailing whitespace and insert final newline on save (done)

On-save formatting (catalog 5.1).

- **Transform** (`lib/on-save.ts` applyOnSave): trims trailing whitespace per line and
  ensures a final newline, both off by default. 5 unit tests.
- **Settings and wiring**: editor.trimTrailingWhitespace and editor.insertFinalNewline,
  applied by EditorPanel's save command.
- **Quality**: 351 unit tests (346 plus 5), typecheck, lint clean (no Rust change), the
  renderer build succeeds, and 40 Playwright e2e pass (the settings e2e now also finds
  Trim Trailing Whitespace). Matrix 5.1 trim-and-final-newline row moved to Partial.

## Slice 52: git revert (done)

Revert a commit (catalog 5.9).

- **Native** (`git.rs` git_revert): creates a revert commit (git revert --no-edit),
  registered in lib.rs. A new cargo test reverts a commit and checks the file is gone
  and a third commit exists (15 cargo tests now).
- **UI**: the GitHistoryModal gains a per-commit Revert button that reloads the list.
- **Quality**: 346 unit tests, typecheck, lint, cargo clean, the renderer build
  succeeds, and 40 Playwright e2e pass (native-gated, so the cargo test covers it).
  Matrix 5.9 merge/rebase/cherry-pick/revert row moved to Partial.

## Slice 51: git commit amend (done)

Amend the last commit (catalog 5.9).

- **Native** (`git.rs` git_commit_amend): amends with the staged changes and a new
  message, registered in lib.rs. A new cargo test amends and checks the rewritten
  commit (14 cargo tests now).
- **UI**: the SourceControlPanel has an Amend last commit toggle.
- **Quality**: 346 unit tests, typecheck, lint, cargo clean, the renderer build
  succeeds, and 40 Playwright e2e pass (native-gated, so the cargo test covers it).
  Matrix 5.9 commit-amend row moved to Partial.

## Slice 50: git push, pull, fetch (done)

Network git operations (catalog 5.9; row moved to Done).

- **Native** (`git.rs`): git_fetch, git_pull (fast-forward only), and git_push,
  registered in lib.rs. A new cargo test pushes from one repo and fetch/pulls into a
  clone through a local bare remote (13 cargo tests now).
- **UI**: the SourceControlPanel gains Fetch, Pull, and Push buttons. Authentication
  uses git's own credential helper or ssh-agent.
- **Quality**: 346 unit tests, typecheck, lint, cargo clean, the renderer build
  succeeds, and 40 Playwright e2e pass (the operations are native-gated, so the cargo
  test covers them). Matrix 5.9 push/pull/fetch row moved to Done.

## Slice 49: tasks.json loading (done)

VS Code task files (catalog 5.11).

- **Parser** (`lib/tasks.ts` parseTasksJson): reads .vscode/tasks.json (label,
  command, args), defensively. 3 unit tests.
- **Loading**: App reads .vscode/tasks.json alongside package.json and registers each
  as a Run Task command.
- **Quality**: 346 unit tests (343 plus 3), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 40 Playwright e2e pass (the loading is native-gated,
  so the parser unit tests cover it). Matrix 5.11 tasks.json row moved to Partial.

## Slice 48: search history (done)

Recent-query recall (catalog 5.8).

- **Helper** (`lib/search-history.ts`): `pushSearchHistory` (dedup, cap 20,
  most-recent-first). 4 unit tests.
- **UI**: the search box pushes a query to history on Enter; Up and Down recall
  previous queries.
- **Quality**: 343 unit tests (339 plus 4), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 40 Playwright e2e pass (the new one cycles the
  history with the arrow keys). Matrix 5.8 search-history row moved to Partial.

## Slice 47: explorer problem decorations (done)

Problem dots in the explorer (catalog 5.7).

- **Helper** (`lib/problem-decorations.ts`): `filesWithProblems` reduces diagnostics
  to a per-file worst severity (error wins over warning). 3 unit tests.
- **Decoration**: ExplorerPanel shows an error or warning dot per file, fed from the
  live diagnostics.
- **Quality**: 339 unit tests (336 plus 3), typecheck, lint clean (no Rust change),
  the renderer build succeeds, and 39 Playwright e2e pass (the new one waits for the
  demo file's unresolved-import errors to mark it). Matrix 5.7 problem-decorations row
  moved to Partial.

## Slice 46: terminal tab rename (done)

Inline tab rename (catalog 5.10).

- **UI**: double-clicking a terminal tab opens an inline input; Enter commits via the
  existing renameTerminal reducer (already unit tested), Escape cancels.
- **Quality**: 336 unit tests, typecheck, lint clean (no Rust change), the renderer
  build succeeds, and 38 Playwright e2e pass (the new one renames a tab to Build).
  Matrix 5.10 tab-rename row moved to Partial.

## Slice 45: terminal context menu and clear (done)

More terminal productivity (catalog 5.10).

- **Context menu**: right-clicking the terminal opens a menu with Copy (selection to
  clipboard), Paste (clipboard to the pty), Select All, and Clear (term.clear).
- **Quality**: 336 unit tests, typecheck, lint clean (no Rust change), the renderer
  build succeeds, and 37 Playwright e2e pass (the new one opens the menu and clicks
  Clear). Matrix 5.10 context-menu and clear rows moved to Done, copy/paste to Partial.

## Slice 44: terminal find and clickable links (done)

Terminal productivity (catalog 5.10).

- **Addons**: TerminalPanel loads the xterm search and web-links addons (new deps
  @xterm/addon-search and @xterm/addon-web-links). URLs in output are clickable.
- **Find bar**: Ctrl or Cmd plus F (intercepted via attachCustomKeyEventHandler)
  opens an in-terminal find bar with next, previous, and match highlighting.
- **Quality**: 336 unit tests, typecheck, lint clean (no Rust change), the renderer
  build succeeds, and 36 Playwright e2e pass (the new one opens the terminal find bar).
  Matrix 5.10 find row moved to Done and the clickable-links row to Partial.

## Slice 43: in-file find and replace (done)

Verifies Monaco's find/replace (catalog 5.1; the row moved to Done).

- **Config**: EditorPanel sets find.seedSearchStringFromSelection and
  autoFindInSelection, making seed-from-selection and find-in-selection explicit on
  top of Monaco's built-in find and replace widget (Ctrl+F, Ctrl+H: regex, case,
  whole-word, counter, navigation, preserve-case).
- **Quality**: 336 unit tests, typecheck, lint clean (no Rust change), the renderer
  build succeeds, and 35 Playwright e2e pass (the new one opens the find widget with
  Ctrl+F). Matrix 5.1 in-file find row moved to Done.

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
