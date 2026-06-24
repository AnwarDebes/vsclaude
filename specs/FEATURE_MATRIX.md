# VS Code Parity Feature Matrix

This file is the single source of truth for how far vsclaude has come toward parity with the editor and IDE capability surface of VS Code. It is produced by Step 0 of the parity build: an audit of the real repository (source files, IPC contracts, Rust core, tests) cross-checked against the specs in this folder.

Two rules govern this matrix:

- The repository wins over hints. Where a spec describes intent but no code implements it, the status reflects the code, not the prose. Spec language is recorded as context, never as evidence of a shipped feature.
- The AI agent and live motion layer (Pixie, the swarm, narration as differentiator, the agent-watching experience) is the product's own half and is tracked in ROADMAP.md, not here. This matrix is only about the editor and IDE surface that vsclaude shares with a general code editor.

## Baseline

Date: 2026-06-24. Already done at baseline: Phase 0 (native desktop build) and Phase A1 (real workspace plus filesystem: file tree, lazy loading, CRUD, dirty tracking, multi-root, external change watcher, recent projects). Tests green: 175 unit tests and 6 Playwright end-to-end tests. IPC protocol version: 3 (contracts frozen).

## Roll-up

| Section | Title | Done | Partial | Missing | Not planned |
| --- | --- | --- | --- | --- | --- |
| 5.1 | Text editing core | 4 | 14 | 9 | 0 |
| 5.2 | Code intelligence (LSP language features) | 0 | 6 | 18 | 0 |
| 5.3 | Editor advanced surface | 6 | 4 | 2 | 0 |
| 5.4 | Diff and merge | 1 | 1 | 6 | 1 |
| 5.5 | Workbench layout and navigation | 5 | 8 | 14 | 0 |
| 5.6 | Quick open and command palette | 7 | 0 | 4 | 0 |
| 5.7 | File explorer and workspace management | 6 | 1 | 7 | 3 |
| 5.8 | Search and replace across files | 5 | 1 | 6 | 0 |
| 5.9 | Source control and git | 4 | 4 | 16 | 0 |
| 5.10 | Integrated terminal | 2 | 3 | 14 | 0 |
| 5.11 | Tasks (VS Code task support) | 0 | 2 | 7 | 0 |
| 5.12 | Debugging (Debug Adapter Protocol) | 0 | 0 | 9 | 0 |
| 5.13 | Snippets and Emmet | 1 | 1 | 3 | 0 |
| 5.14 | Settings and configuration | 0 | 4 | 5 | 1 |
| 5.15 | Keybindings and keymaps | 2 | 2 | 7 | 0 |
| 5.16 | Themes and appearance | 6 | 5 | 11 | 0 |
| 5.17 | Extensions and plugin ecosystem | 5 | 2 | 11 | 0 |
| 5.18 | Notebooks | 0 | 0 | 6 | 0 |
| 5.19 | Remote development and tunnels | 0 | 0 | 6 | 0 |
| 5.20 | Accessibility (full) | 1 | 11 | 4 | 0 |
| 5.21 | Productivity and workspace lifecycle | 3 | 5 | 9 | 0 |
| 5.22 | Custom editors, webviews, and previews | 1 | 2 | 7 | 0 |
| 5.23 | Performance, logging, diagnostics, updates | 0 | 3 | 5 | 0 |
| TOTAL | | 59 | 79 | 186 | 5 |

## Legend

- Done: implemented in the repository and working end to end, not merely a Monaco default that happens to be on. A Done item is also tested, accessible, and wired into the app.
- Partial: some real implementation exists, but it is incomplete, relies on unconfigured Monaco defaults, is not exposed in the UI, or covers only a narrow slice of the capability.
- Missing: no implementation in the repository. The capability may be described in a spec, but no code delivers it.
- Not planned: intentionally out of scope for the current phases, recorded so it is not mistaken for an oversight.

## 5.1 Text editing core

The editor integrates Monaco 0.55.1 with minimal explicit configuration. Essential Monaco defaults (syntax highlighting, bracket pair colorization, folding, sticky scroll) are available but not surfaced in the UI or command palette. Critical text-editing features (find and replace in file, multi-cursor operations, case transforms, line operations, smart selection, and comprehensive editor settings for EOL, encoding, word wrap, indentation, auto-closing brackets, and read-only regions) are not implemented. The editor prioritizes agent diff review and basic file navigation; substantial text-editing capability remains absent or unexposed.

| Capability | Status | Evidence | What is missing |
| --- | --- | --- | --- |
| Basic cursor and selection | Done | EditorPanel.tsx passes through Monaco; single cursor and selection work via standard input. | |
| Multi-cursor (add above/below, next/all occurrences) | Partial | EDITOR_SPEC.md line 301 claims Alt modifier, Ctrl+Shift+L, Ctrl+D; EditorPanel.tsx sets no multiCursorModifier (relies on defaults). | No explicit modifier config; no command palette registration or Alt wiring verified. |
| Column/box selection | Partial | EDITOR_SPEC.md line 310 notes column selection; Monaco supports it by default. | No explicit config or UI; depends on unverified defaults. |
| Find and replace in file (regex, case, whole word, in-selection, count, seed, preserve case) | Missing | No find/replace UI in EditorPanel.tsx; spec sections 8.1-8.2 cover only global search and quick-open. | No in-file widget, no Ctrl+H, no toggles, counter, navigation, or selection seeding. |
| Smart expand/shrink selection by syntax | Missing | No mention in EDITOR_SPEC.md 7.1-7.2; no expand/shrink code in apps/desktop/src or packages/editor/src. | Ctrl+Shift+Right/Left not exposed via config or palette. |
| Line operations (move/copy, delete, insert, join, indent/outdent, transpose, sort, trim) | Missing | No line-operation commands in EditorPanel.tsx; not listed in spec 7.1-7.2. | No Ctrl+Shift+K, Alt+Up/Down, Ctrl+Shift+D, Ctrl+J, indent/outdent, transpose, sort, or trim. |
| Case transforms (upper/lower/title) | Missing | No command registration in EditorPanel.tsx; not listed in spec. | No case-conversion commands. |
| Word wrap and wrap column control | Missing | EditorPanel.tsx options omit wordWrap, wordWrapColumn, wrappingIndent. | No wrap toggle, custom column, or wrap-indent control. |
| Auto-closing brackets and quotes | Partial | Monaco default-on; EditorPanel.tsx sets neither autoClosingBrackets nor autoClosingQuotes. | No explicit config or user toggle. |
| Auto-surround and bracket pair selection | Partial | Monaco supports auto-surround by default; no explicit config. | No config, no verification, no UI toggle. |
| Bracket matching and pair colorization | Partial | Spec 7.1 line 306 marks colorization default on; EditorPanel.tsx does not disable it. | Enabled by default but not configured or exposed; no toggle. |
| Bracket pair guides | Missing | No mention in spec 7.1; no bracketPairGuides config. | Not explicitly enabled or configured. |
| Indentation (detect, spaces/tabs, convert, tab size, guides) | Partial | EditorPanel.tsx sets tabSize: 2; no detectIndentation or insertSpaces. | No auto-detect, no insertSpaces toggle, no convert command, no explicit guide config. |
| Whitespace and control char rendering, render final newline | Partial | EditorPanel.tsx sets renderWhitespace: 'selection'; renderFinalNewline and renderControlCharacters not set. | Only selection mode; no show-all/trailing; final newline and control chars unset. |
| Cursor styles, blink rate, smooth caret, surrounding lines | Partial | EditorPanel.tsx sets cursorBlinking: 'smooth'; other cursor options unset. | No cursorStyle, cursorSurroundingLines, or surrounding-line styling. |
| Smooth scrolling, fast scroll, scroll beyond last line, wheel zoom | Partial | EditorPanel.tsx sets smoothScrolling: true, scrollBeyondLastLine: false. | fastScrollSensitivity and wheel-zoom unset; scrollBeyondLastLine differs from VS Code default. |
| Drag-drop text, copy/cut whole line, multi-paste | Partial | Monaco default behaviors not disabled in EditorPanel.tsx. | Defaults likely on but unverified; multi-paste not in specs. |
| Undo/redo and undo stops, soft undo across saves | Missing | No undo config in EditorPanel.tsx; no undo-history sync in IPC. | No soft undo, no undo stops API, no persistence. |
| EOL handling (LF/CRLF detect, convert, platform default) | Partial | FilePayload reports eol (spec 3.2/11.1); EditorPanel.tsx exposes no EOL UI. | Core reads EOL but no selection, conversion, or platform-default UI. |
| Encoding (detect, reopen with, save with, guess) | Partial | FilePayload includes encoding (spec 3.2); EditorPanel.tsx has no encoding option. | Detected but no picker, reopen-with, or save-as-encoding. |
| Trim auto whitespace, insert final newline, trimFinalNewlines | Missing | None of these options in EditorPanel.tsx; not in spec. | No trim-trailing, final-newline insertion, or trimFinalNewlines. |
| Large-file optimizations and tokenization limit | Missing | No largeFileOptimizations or maxTokenizationLineLength in EditorPanel.tsx. | No large-file mode or tokenization limit. |
| Read-only editors and read-only regions | Partial | FilePayload has readonly (spec 3.2); only diff tabs are read-only; main editor ignores the flag. | Main EditorPanel does not respect the readonly flag. |
| Line numbers, folding, minimap, breadcrumbs, sticky scroll | Partial | EditorPanel.tsx enables minimap; folding/breadcrumbs/sticky scroll are Monaco defaults (spec 7.1). | Not explicitly configured; no UI toggle or verification. |
| Syntax highlighting and language support | Done | EditorPanel.tsx LANG_BY_EXT for TS/TSX/JS/JSX/JSON/CSS/HTML/MD/Rust; monaco-setup.ts loads workers. | |
| Font configuration (family, size, ligatures) | Done | EditorPanel.tsx sets fontFamily, fontSize: 13, fontLigatures: true. | |
| Theme integration (dark theme, color tokens) | Done | EditorPanel.tsx uses theme 'vs-dark'; monaco-setup.ts custom environment. | |

## 5.2 Code intelligence (LSP language features)

vsclaude implements a limited set of code intelligence features, relying on Monaco's built-in capabilities. Multi-cursor, syntax highlighting, minimap, and folding come from Monaco defaults. Language support covers TS, JS, JSON, CSS, HTML, Markdown, and Rust through workers. Diagnostics now surface: the Monaco worker markers are collected into a Problems panel and an error and warning count in the status bar (see specs/PROBLEMS_AND_DIAGNOSTICS.md). There is still no external language server bridge and no advanced IDE features (code actions, hover wiring, symbol navigation, refactoring, formatting, semantic highlighting). The LSP host (A2) has not started; the app focuses on displaying agent edits rather than hand-editing.

| Capability | Status | Evidence | What is missing |
| --- | --- | --- | --- |
| IntelliSense (completions, signature help, hover) | Partial | monaco-setup.ts configures TS/JS worker; no custom providers registered in apps/desktop/src. | No completion/hover/signature providers; LSP bridge (spec 7.4) not implemented. |
| Go to definition/declaration/type/implementation/references | Missing | No definition or reference providers found in apps/desktop/src or packages/editor/src. | No navigation; needs LSP bridge or provider registration. |
| Find all references results view | Missing | No references panel or provider; global search is ripgrep text search (spec 8). | No symbol reference finder. |
| Rename symbol with cross-file preview | Missing | No rename provider in EditorPanel.tsx. | No symbol rename; needs LSP bridge. |
| Code actions and quick fixes (lightbulb) | Missing | No CodeActionProvider or lightbulb UI. | No quick fixes; needs provider or bridge. |
| Refactorings (extract, inline, move to file) | Missing | No refactoring UI, commands, or provider. | No refactoring features. |
| Document and range formatting (on save/paste/type) | Missing | onSave does not format; no FormattingEditProvider; format options unset. ACTIONS.ts lists 'format' but it is unwired. | No formatting. |
| Organize/sort imports and unused cleanup | Missing | No organize-imports command or provider. | No import sorting or cleanup. |
| Diagnostics with severities, Problems panel, squiggles | Partial | useDiagnostics.ts collects Monaco worker markers into the core-shell diagnostics model; ProblemsPanel.tsx lists them grouped by file; the status bar shows error and warning counts; squiggles render from the workers. See specs/PROBLEMS_AND_DIAGNOSTICS.md. | No external language-server diagnostics, no related information, no gutter glyph customization, no quick fixes. |
| Semantic highlighting (over TextMate) | Missing | semanticHighlighting not enabled; no SemanticTokensProvider. | Only TextMate; needs bridge. |
| Document and workspace symbols | Partial | Spec mentions breadcrumbs and @ quick-open, but no symbol providers registered. | No symbol picker; workspace symbol search absent. |
| Call hierarchy and type hierarchy | Missing | No hierarchy providers or UI. | No hierarchy views. |
| Document links and highlights | Missing | No DocumentLink or DocumentHighlight provider. | No link or highlight support. |
| Folding and selection ranges from language | Partial | Monaco default folding enabled; no FoldingRangeProvider override. | No language-specific richer folding ranges. |
| CodeLens | Missing | No CodeLensProvider or lens UI. | No CodeLens. |
| Inlay hints | Missing | inlayHints unset; no provider. | No inlay hints. |
| Color decorators and inline color picker | Missing | No ColorProvider; colorDecorators unset. | No color decorators or picker. |
| Language servers (TS/JS, Python, Rust, JSON, HTML, CSS) and extensibility | Missing | No LSP bridge in src-tauri/src; spec 7.4 calls it a follow-up; WORKSPACE_AND_FILES.md defers LSP to A2. | No LSP integration; Python/Rust native support absent; A2 not started. |
| Per-language config (comments, brackets, word patterns, on-enter) | Missing | No registerLanguageConfiguration calls. | No per-language behavior config. |
| Language detection and manual mode switch | Partial | languageFor(path) maps extensions to Monaco ids; language prop override exists. | Extension-based only; no content detection; switch not in UI. |
| TS/JS smart editing (auto imports, update on move, JSDoc, inlay hints, CodeLens) | Missing | No auto-import, rename-update, JSDoc, inlay, or CodeLens registration. | No TS/JS smarts beyond the worker. |
| Emmet expansion for HTML/CSS | Missing | No Emmet config; Monaco needs explicit registration. | No abbreviation expansion. |
| JSON schema validation and completion | Partial | monaco-setup.ts registers jsonWorker; built-in JSON validation applies. | No custom schemas for package.json, tsconfig.json, etc. |
| Markdown preview (synced scroll, link completion, math/diagram, broken-link diagnostics) | Missing | .md opens in Monaco text editor, not preview; no markdown providers. | No preview, link completion, math, or broken-link detection. |

## 5.3 Editor advanced surface

The editor uses Monaco 0.55.1 with minimal configuration. Only the minimap is explicitly enabled; other advanced features (sticky scroll, folding, breadcrumbs, inline diagnostics, rulers, indent guides, bracket colorization) rely on Monaco defaults that are on, but are not exposed through UI controls or explicitly wired. The app emphasizes simplicity in early alpha over full parity on the advanced surface.

| Capability | Status | Evidence | What is missing |
| --- | --- | --- | --- |
| Minimap (headers, find-match highlight, slider, side/size) | Partial | EditorPanel.tsx line 58 enables minimap with defaults. | No UI toggle; no side/size, slider, or maxColumn config. |
| Sticky scroll (enclosing scopes pinned) | Done | Spec line 308; Monaco default on; not disabled in EditorPanel.tsx. | |
| Code folding (language-aware, manual, regions, fold/unfold all, by level) | Done | Spec line 306; Monaco default on; keyboard shortcuts work. | (No custom fold-all UI buttons, but core feature is present.) |
| Line numbers (absolute/relative/interval/off) | Done | Monaco lineNumbers default on; not disabled. | (No UI toggle for mode switching.) |
| Rulers at columns | Missing | No ruler option in EditorPanel.tsx options. | rulers array not configured. |
| Breadcrumbs (path plus symbol nav plus dropdowns) | Done | Spec line 305; Monaco breadcrumbs default on; not disabled. | (No custom styling beyond defaults.) |
| Inline diagnostics plus squiggle/gutter icons | Partial | Monaco shows squiggles when workers provide them; TS/JS workers configured. | No custom diagnostic provider; only TS/JS; no toggle or gutter config. |
| Hover controls, def-on-hover preview, click-to-peek | Partial | Monaco hovers default on; TS worker provides hovers; spec 7.3 registration surface unwired. | No definition/references provider; no peek or Ctrl+Click-to-def. |
| Word-based suggestions across open docs | Partial | Monaco completions default on; word-based built in. | No explicit or cross-document config. |
| Suggest widget status bar plus details toggle | Done | Monaco suggest widget default on with details pane; not disabled. | |
| Outline rendering source for Outline view | Missing | No Outline panel or document-symbol provider in apps/desktop/src. | No Outline view or symbol provider. |
| Indent guides plus bracket guides plus active highlight | Done | Monaco indent and bracket guides default on; not disabled. | (No custom color/width/active styling.) |

## 5.4 Diff and merge

The diff and merge subsystem is minimal. Only a text-based diff viewer for git review exists (DiffReview.tsx); the Monaco diff editor, the three-way merge editor, and the advanced features in the spec are not implemented. The spec reserves the merge editor as its own spec (out of scope for git), but even the diff editor (in scope, spec section 6) is absent. The git model in packages/git does not track conflicted file state, and no conflict-resolution UI exists.

| Capability | Status | Evidence | What is missing |
| --- | --- | --- | --- |
| Basic text diff viewer | Done | DiffReview.tsx renders unified diff with colored lines; git.rs provides gitDiff(); file list and commit UI present. | |
| Monaco diff editor (side-by-side and inline) | Missing | Spec 6.1 describes createDiffEditor; packages/editor/src/diff does not exist; no createDiffEditor calls. | No diff editor wrapper, model loading, or mode toggle. |
| Diff change navigation and counter | Missing | Spec 6.3 specifies goToDiff and counter; DiffReview.tsx has no navigation. | No next/prev, counter, or overview ruler. |
| Per-hunk accept/reject and gutter controls | Missing | Spec 6.3/11.3 describe per-hunk controls; DiffReview.tsx has none. | No hunk accept/reject, gutter decorations, or partial apply. |
| Collapse unchanged regions in diff | Missing | DiffReview.tsx renders a flat line list. | No collapse of context regions. |
| Accessible diff viewer | Partial | DiffReview.tsx has role='dialog' and header aria-label; diff lines are plain spans. | Lines lack ARIA live regions and semantic labels; no screen-reader hunk descriptions. |
| Compare feature (select, with saved, across workspace, folders) | Missing | Spec 6.2 lists manual compare; no compare UI exists. | No compare mode, dialog, folder, or multi-file comparison. |
| Three-way merge editor (current/incoming/result) | Not planned | GIT_SPEC section 17 states the merge editor is its own spec, a non-goal for git. | Out of scope for current phase. |
| Inline merge-conflict decorations and accept actions | Missing | No conflict decorations or resolution buttons; model.ts has no conflicted state. | No conflict highlighting, accept buttons, or conflict detection. |
| Diff settings (ignore trim whitespace, side-by-side threshold, max compute time) | Missing | No diff settings in DiffReview.tsx or EditorPanel.tsx. | No whitespace, algorithm, threshold, or compute-limit options. |

## 5.5 Workbench layout and navigation

vsclaude uses a fixed, presentation-mode-driven layout rather than the dockable workbench VS Code provides. The core panel tree (panel-tree.ts) supports arbitrary splits but is not wired to the renderer. The app uses a hardcoded grid with fixed positions that change across five presentation modes (companion, stage, swarm, minimal, cozy). A real status bar now ships (branch and change count on the left; language, end-of-line, indentation, cursor position, and selection on the right), driven by a reusable status-bar-item model and a live editor-status store; see specs/STATUS_BAR.md. Editor tabs support keyboard navigation but only standard tabs, with no pinned, preview, or split groups. Floating windows, dockable panels, an activity bar, problems and outline views, and split-group navigation are specified but unimplemented.

| Capability | Status | Evidence | What is missing |
| --- | --- | --- | --- |
| Presentation modes (layout switching) | Done | App.tsx registers mode commands; styles.css mode grids; PresentationMode type with five values; SettingsBar.tsx buttons. | |
| File explorer with tree navigation and keyboard control | Done | ExplorerPanel.tsx and WorkspaceExplorer.tsx implement expand/collapse, arrow nav, roving focus, indentation; real explorer adds context menu and drag-drop. | |
| Editor tabs with keyboard roving, close, dirty tracking | Done | WorkspaceEditor.tsx implements arrow/Home/End nav, Delete/Backspace close, one-tab-stop model, dirty indicator, aria-selected. | |
| Preview tabs (single-click provisional, double-click pins) | Missing | WorkspaceEditor.tsx has no preview mode; OpenDoc lacks preview/pinned fields. | No provisional preview tab or promotion on edit/pin. |
| Editor split groups (horizontal and vertical) | Partial | panel-tree.ts implements a binary split tree with tests; renderer (WorkspaceEditor.tsx, App.tsx) exposes only one pane. | Split model never instantiated; no split UI, group focus/move, or drag between groups. |
| Dockable panels (move, float, relocate) | Missing | Spec 5.3 specifies a dockable manager; App.tsx hardcodes grid columns; panel-tree.ts unused by renderer. | No dockable manager; fixed positions per mode; no float or persist. |
| Activity bar with view containers and badges | Missing | No activity bar; App.tsx renders header/main/footer only. | No view containers or badges. |
| Primary and secondary sidebars (left/right) | Partial | App.tsx renders left explorer and right sidebar (companion, timeline); placement hardcoded per mode. | Views cannot move between sidebars or hide independently. |
| Bottom panel (terminal, problems, output, debug console) | Partial | App.tsx footer renders TerminalPanel, TokenPanel, Narration; only terminal is wired. | No problems, output, or debug console; panel cannot maximize, move, or sash-resize. |
| Sash resizing (visual splitter) | Missing | No sash elements; fixed grid columns; ResizeObserver only in TerminalPanel.tsx. | No draggable splitters; layout not user-resizable. |
| Outline / Document Symbol view | Missing | No Outline panel; breadcrumbs/symbols are Monaco features only. | No Outline panel. |
| Problems / Diagnostics view | Done | ProblemsPanel.tsx is a docked, grouped, jump-to-able panel; the status bar carries the error and warning count badge; View: Problems and Ctrl or Cmd plus Shift plus M toggle it. | |
| Status bar (language, encoding, EOL, indent, cursor, branch, errors) | Partial | StatusBar.tsx renders the error and warning counts, branch and change count, language, EOL, indentation, cursor position, and selection, from core-shell orderStatusItems and the editor-bridge status store; cursor opens go-to-line, branch opens review, and the problems item toggles the panel. | Encoding indicator; the value items are not yet clickable pickers (language mode, EOL, indentation). |
| Open Editors / Open Documents view | Missing | Tabs show open files inline; no separate list view. | No Open Editors view. |
| Drag-drop editors between groups | Missing | No multi-group support; no tab reorder via drag. | No drag between groups or tab reorder. |
| Drag-drop views between containers | Missing | Panels hardcoded per mode; no relocation API. | No relocating views between sidebars or panel. |
| Floating / auxiliary editor windows | Missing | No floating window support; single-window only. | No float of a view or editor group. |
| Zen mode (hide UI chrome) | Missing | No zen toggle; minimal mode reduces but does not hide chrome. | No full chrome-hiding zen mode. |
| Full screen / distraction-free | Missing | No fullscreen UI or API integration. | No fullscreen or distraction-free toggle. |
| Custom title bar / menu bar | Missing | App.tsx renders a brand header; SettingsBar.tsx has control buttons, no menus. | No File/Edit/View menu bar or customizable title bar. |
| Layout persistence across sessions | Partial | useWorkspace.ts persists root paths and recents; App.tsx restores presentationMode. | No split sizes, panel positions, tab order, or active tab persisted. |
| Reset layout to defaults | Missing | No reset-layout command or button. | No reset to factory layout. |
| Show/hide individual views independently | Partial | Mode switching shows/hides panels conditionally. | No per-view toggle; visibility coupled to mode. |
| Focused / zen editor expansion | Partial | Minimal mode shows only center editor. | No per-panel maximize button or transition animation. |
| Command palette (fuzzy search, run commands) | Done | CommandPalette.tsx (Ctrl/Cmd+K, fuzzy, arrows, Enter); CommandRegistry ranks; commands in App.tsx. | |
| Search/replace functionality | Partial | Quick-open ships: Ctrl/Cmd+P file open, : go-to-line, and the > command route (CommandPalette.tsx, see 5.6). Monaco's in-file find is on by default. | Project-wide search and replace across files (5.8), and @ or # symbol search, are still missing. |
| Breadcrumbs / path navigation | Missing | Spec 7.1 mentions breadcrumbs as a Monaco feature; no breadcrumb element in renderer. | No breadcrumb trail or clickable path nav. |
| Keyboard shortcuts and customization | Missing | CommandPalette.tsx and WorkspaceEditor.tsx hardcode keys; no rebinding. | No keybindings.json, editor, or shortcut help view. |

## 5.6 Quick open and command palette

The palette is now unified: Ctrl or Cmd plus K opens command mode and Ctrl or Cmd plus P opens file quick-open over a real recursive index, and the input routes live on a prefix (`>` commands, `:` go to line and column). Commands can advertise a keybinding, and a reusable quick-pick framework (filterQuickPick plus the prefix router) backs it all. Document symbols (@), workspace symbols (#), command categories, and go-to-definition navigation remain, deferred to the code-intelligence slice. See specs/QUICK_OPEN.md.

| Capability | Status | Evidence | What is missing |
| --- | --- | --- | --- |
| Command palette (fuzzy, keywords, Ctrl/Cmd+K) | Done | CommandPalette.tsx fuzzy search via registry.fuzzyFind(); command-registry.ts subsequence scoring and keywords; arrow/Enter nav. | |
| Recently-used command/project ordering | Done | App.tsx registers Open Recent from ws.recents; recents.ts RecentProject with timestamps and de-dup; useWorkspace.ts exposes recents. | |
| Quick open files by name with Ctrl+P | Done | CommandPalette.tsx file mode on Ctrl/Cmd+P; useFileIndex.ts walks roots via fs.walk (IPC v4, fs_ops.rs fs_walk); demo files used when no workspace; e2e covers it. | |
| Symbol navigation in current file with @ | Missing | parsePaletteInput reserves @ but falls through; no DocumentSymbolProvider wired. | Deferred to 5.2: needs a document-symbol provider. |
| Workspace symbols search with # | Missing | # reserved in the router but not handled; no WorkspaceSymbolProvider. | Deferred to 5.2: needs a workspace-symbol provider. |
| Go to line/column with : | Done | parsePaletteInput parses :line and :line:column; editor-bridge.ts gotoLine reveals and selects in the active Monaco editor; unit tested. | |
| Commands via > prefix | Done | parsePaletteInput routes > to command mode inside the unified palette; e2e switches files to commands with >. | |
| Keybinding display in palette | Done | Command.keybinding field (command-registry.ts); CommandPalette renders it right-aligned; Go to File and Show All Commands carry real shortcuts. | |
| Command categories/grouping | Missing | Command interface has no category field; palette renders a flat list. | No category field or grouping headers. |
| Go to definition and back/forward stack | Missing | No DefinitionProvider; no navigation stack or commands. | Deferred to 5.2: go-to-def, history stack, back/forward. |
| General reusable quick-pick framework | Done | core-shell quick-pick.ts: QuickPickItem, filterQuickPick ranker, parsePaletteInput router; unit tested; reused by file mode and ready for branch, profile, theme, and search pickers. | |

## 5.7 File explorer and workspace management

Phase A1 is substantially complete: a working file tree, lazy loading, full CRUD, dirty tracking, and external change detection via watcher. The tree supports create, rename, delete, move, copy from context menu and keyboard (F2, Delete, drag-drop). Multi-root workspaces work. Recent projects persist and restore. Tabs show dirty indicators. Several parity features are deferred: preview tabs, workspace files and per-root settings, file icon themes, git and problem decorations, auto-reveal, cut/paste, file nesting, and compact folders.

| Capability | Status | Evidence | What is missing |
| --- | --- | --- | --- |
| Tree create/rename/delete/move/copy/duplicate | Done | WorkspaceExplorer.tsx and useWorkspace.ts implement all operations; fs_ops.rs provides the Rust commands. | |
| Drag-drop move within tree | Done | WorkspaceExplorer.tsx onDragStart/onDrop call ws.move(); useWorkspace.ts move() via fs_rename. | |
| OS file import via drag-drop/paste | Missing | Only internal text/vsclaude-path drag; no dataTransfer.files handling. | No external file drop or paste into the tree. |
| Multi-root workspaces | Done | useWorkspace.ts WorkspaceRoot[] with openPath/closeRoot; App.tsx per-root commands; WORKSPACE_AND_FILES.md section 4. | |
| Workspace files (.code-workspace) and per-root settings | Not planned | WORKSPACE_AND_FILES.md defers to Editor Spec A2/A3; A1 uses absolute paths. | Tracked as A2-plus; no workspace file format in A1. |
| File nesting rules and compact folder display | Not planned | No nesting or compact-folder code or spec mention. | Not implemented and not in the planned spec. |
| File decorations for git status | Missing | WorkspaceExplorer.tsx renders only dirty and type glyphs; git status only in DiffReview modal. | No git status colors/badges in the tree. |
| File decorations for problems/errors | Missing | No problem/diagnostic indicators in explorer components. | No error/warning decorations; diagnostics deferred to A3. |
| Auto-reveal active file | Missing | No reveal logic; explorer tracks active path but does not expand parents. | No auto-expand of parent directories on editor switch. |
| files.exclude, search.exclude, watcherExclude | Missing | No exclusion patterns; WORKSPACE_AND_FILES.md section 5 defers gitignore filtering. | No exclusion settings; noise dirs still listed. |
| Open Editors section with dirty indicators and headers | Done | WorkspaceEditor.tsx tablist shows open docs, active class, dirty span, close button, roving keyboard nav. | |
| New untitled file and language selection | Partial | App.tsx New File prompts a name (default untitled.ts); languageFor() infers language from extension. | No save-as language picker or immediate language selection. |
| Recent projects/open roots persist and restore | Done | useWorkspace.ts localStorage RECENTS_KEY/ROOTS_KEY with load/persist; recents.ts with tests; App.tsx Open Recent. | |
| File icon theme support | Missing | WorkspaceExplorer.tsx renders only Unicode glyphs for folder/file. | No Codicons or icon themes; file types not differentiated. |
| Tabs with active indicator and multi-document navigation | Done | WorkspaceEditor.tsx tablist with dirty indicator, close button, arrow/Home/End/Delete nav. | |
| Cut/paste file operations | Missing | Context menu has Copy Path but no Cut or Paste. | No clipboard-based file cut/paste. |
| Preview tabs (single-click to preview) | Not planned | EDITOR_SPEC.md 5.2 defers preview tabs; A1 uses persistent tabs. | Planned beyond A1; all files open as permanent tabs. |

## 5.8 Search and replace across files

Project-wide search now ships. The `search.find` IPC command (protocol v5) runs a gitignore-aware engine in the Rust core, built on the same ignore and grep crates ripgrep is, with regex, case, and whole-word options and include and exclude globs. The SearchPanel surfaces it with a debounced query, toggle buttons, glob inputs, and a results tree grouped by file where each match highlights the hit and opens its file at the line. Replace across files, a persistent Search Editor, scope toggles, and search history remain. Monaco's single-file find is still available as a default. See specs/SEARCH.md.

| Capability | Status | Evidence | What is missing |
| --- | --- | --- | --- |
| Monaco built-in find/replace (single-file) | Done | EditorPanel.tsx does not disable the find widget; Monaco enables Ctrl+F/Ctrl+H by default. | |
| Global project-wide search via ripgrep | Done | search.find (ipc.ts, protocol v5) runs search.rs run_search on the ignore and grep crates; SearchPanel.tsx surfaces it; covered by Rust tests. | |
| Quick-open/fuzzy file picker | Done | CommandPalette.tsx Ctrl/Cmd+P over the fs.walk index (see 5.6). | |
| Search result tree with context | Partial | SearchPanel.tsx renders a results tree grouped by file with match counts, highlighted hits, and jump-to-line. | No surrounding context lines (only the match line) and no expand and collapse of context. |
| Replace with per-match and per-file preview | Missing | No replace UI or write path; the result model carries the ranges replace will need. | No per-match preview, selection, or transactional apply. |
| Search toggles (regex, case, whole-word) | Done | SearchPanel.tsx toggle buttons feed SearchOptions; the Rust matcher honors regex, case_insensitive, and word. | |
| Include/exclude globs and gitignore | Done | SearchOptions includeGlobs and excludeGlobs map to ignore OverrideBuilder; WalkBuilder respects .gitignore; Rust test covers it. | |
| Open-editors and folder scope toggle | Missing | No scope selector or scope management. | No scope radio/dropdown or selection-aware search. |
| Search history | Missing | No search-history state or persistence. | No recall of previous queries. |
| Search in selection | Missing | No selection-boundary detection for search. | No search-in-selection toggle. |
| Search Editor (persistent view) | Missing | Tab kinds list file/diff/agent-diff/welcome only; no search kind. | No persistent editable results view. |
| Toggle details (expand/collapse context) | Missing | No detail expansion or context rendering. | No summary/detail toggle or context lines. |

## 5.9 Source control and git

vsclaude has a minimal git implementation focused on agent-driven workflows. Repository status (porcelain parsing) and a basic commit flow live in the DiffReview modal, with git_action events and status/branch labels for display. All branch operations, network operations, staging granularity beyond full-file, conflict resolution UI, history and blame, and a dedicated SCM panel are missing. GIT_SPEC designs these but they are not built; the spec is a roadmap, not a shipping implementation.

| Capability | Status | Evidence | What is missing |
| --- | --- | --- | --- |
| Git status and branch information | Done | git.rs git_status parses porcelain v1; parse.ts partitions staged/unstaged/untracked and branch/ahead/behind; summarize.ts labels; DiffReview displays. | |
| Diff viewing (inline and full) | Done | git.rs git_diff; DiffReview.tsx renders line-by-line with kind classes. | |
| Commit with message input | Done | git.rs git_commit stages all and commits; DiffReview.tsx message field with validation and refresh. | |
| Staging and unstaging (file and hunk level) | Missing | No git_stage_paths/unstage/stage_hunk; git_commit always uses add -A. | No granular staging UI; hunk staging unwired. |
| Commit amend | Missing | No git_amend command or confirmation-token infrastructure. | No amend, token gating, or re-read invariant. |
| Branch operations (create/checkout/delete/rename) | Missing | No branch IPC commands; no branch picker UI. | No branch info, create, switch, rename, or delete. |
| Merge, rebase, cherry-pick, revert | Missing | No merge/rebase/cherry-pick/revert commands; operation state read-only. | No commands to trigger or continue/abort. |
| Push, pull, fetch, sync with ahead/behind | Partial | Ahead/behind parsed and shown (parse.ts, summarize.ts); no push/pull/fetch commands. | No network IPC or credential flow. |
| Remotes (add/remove/rename/tracking) | Missing | No remote commands or UI. | No remote management. |
| Stash (create/apply/pop/drop/list/include-untracked) | Missing | No stash commands despite spec section 13 backup use. | No stash management or UI. |
| Tags (create/delete/push/list) | Missing | No tag commands; tag exists only as a narration kind. | No tag operations or UI. |
| Blame (inline, gutter, annotation) | Missing | No git_blame; spec section 17 lists blame as a non-goal for v1. | Out of scope for phase 0. |
| History, commit graph, per-file history, Timeline | Partial | events.ts supports status narration; TimelinePanel shows agent events, not commits. | No git_log, pagination, per-file history, or graph. |
| Merge conflict resolution (merge editor, inline markers) | Missing | Status model can hold conflicted files but no resolution UI or marker parser. | No conflict markers, merge editor, or resolve actions. |
| Gutter decorations (added/modified/deleted, peek diff) | Missing | DiffReview shows file-level badges only; no line gutter marks. | No change-tracking gutter or peek diff in the editor. |
| Gitignore awareness and add-to-gitignore action | Missing | Parser ignores ignored-file lines; no add-to-gitignore command. | No gitignore action. |
| Submodules | Missing | No submodule commands; spec section 17 marks them a non-goal. | Out of scope per spec. |
| Worktrees | Missing | No worktree commands. | Likely out of scope; not in spec. |
| Commit signing and credential flow | Partial | Shell fallback would honor commit.gpgsign; no key/credential UI; signoff field unused. | No GPG key selection, credential prompts, or signoff checkbox. |
| SCM provider API for non-git systems | Missing | Git hardcoded in git.rs; no provider abstraction. | No SVN/Mercurial/Perforce support. |
| Destructive operation gating and confirmation tokens | Missing | Spec defines tokens; no generation/validation; DiffReview has no destructive actions. | No typed confirmation tokens for discard/reset/delete. |
| git_action event integration with Pixie celebration | Done | events.ts gitActionEvent() builds git_action AgentEvent; demo session includes one. | |
| SCM view/panel UI with grouped changes and status bar | Missing | Only the DiffReview modal exists; no persistent SCM panel. | No left-rail Git panel with staged/changes/history sections. |
| Live updates and .git watching | Partial | notify watcher exists in fs_ops.rs; DiffReview re-reads after commit and via refresh button. | No watcher scoped to .git or auto-refresh on .git changes. |

## 5.10 Integrated terminal

The terminal is foundational but minimal: a real PTY backend (portable-pty via Rust), a typed IPC protocol, and a working xterm.js surface with basic input and output. It lacks nearly all productivity features: no tabs, splits, profiles UI, shell integration, find, copy-on-selection, link detection (the spec promises WebLinksAddon but it is unwired), or rename/customization. Multi-terminal session types exist in session.ts but are not exposed. Only FitAddon is loaded.

| Capability | Status | Evidence | What is missing |
| --- | --- | --- | --- |
| PTY core and shell invocation | Done | pty.rs full lifecycle (create/write/resize/kill) with shell detection and event bridge; session.ts TerminalSession. | |
| Single terminal display and interaction | Done | TerminalPanel.tsx xterm Terminal with FitAddon; keystrokes to ptyWrite; output from pty:data; resize and exit handled. | |
| Multiple terminals and tabs | Missing | session.ts has lifecycle but no tab UI; TerminalPanel.tsx is a single component; registry exists in pty.rs but renderer cannot enumerate. | No tab bar, new-tab button, or multi-session management. |
| Terminal profiles (bash/zsh/pwsh/cmd/git bash/custom) | Partial | pty_create accepts a shell override; detection for Windows and Unix; ipc.ts allows shell param. | No profile UI, stored list, or shell switcher. |
| Shell integration (command decorations, nav, exit-code, cwd) | Missing | No decorations or exit-code rendering; pty:exit carries code but is not shown. | No command separators, exit-code status, cwd inference, or recent-command pickers. |
| Clickable links (paths, line:col, URLs) | Missing | TerminalPanel.tsx does not load WebLinksAddon; spec mentions it in pseudocode only. | No link detection, URL opening, or path parsing. |
| Find in terminal | Missing | No SearchAddon or search UI; Ctrl+F not intercepted. | No search input, highlighting, or navigation. |
| Copy, paste, copy-on-selection | Missing | Native xterm copy works but no explicit copy-on-selection or paste wiring; no context menu. | No copy-on-selection toggle or right-click menu. |
| Right-click options (context menu) | Missing | No onContextMenu handler in TerminalPanel.tsx. | No context menu at all. |
| Rename, change icon/color, tab description | Missing | No rename, icon, color, or description UI; no tab metadata. | No tab customization. |
| Sticky scroll and scrollback config | Partial | FitAddon plus xterm default scrollback (10,000). | No scrollback limit picker or sticky-scroll toggle. |
| Clear terminal | Missing | xterm .clear() not exposed or bound. | No clear button or shortcut. |
| Persistence and reconnection across reloads | Missing | TerminalPanel creates a PTY on mount and kills on unmount; no pty_list to re-attach. | No session persistence or recovery. |
| Process revival | Missing | pty_kill on unmount; no background process kept alive. | No detach-and-reattach flow. |
| Env var collections from features/plugins | Missing | pty_create accepts env in some paths but not in the UI; no plugin injection. | No env UI or plugin env collection. |
| Send-text and run-command interfaces | Missing | pty_write exists but is not exposed as a send-text command. | No send-to-terminal action or run-command picker. |
| Quick-fix surface | Missing | No output parsing or quick-fix UI. | No lightbulb or error-pattern detection. |
| xterm addon ecosystem integration | Partial | FitAddon loaded; spec references Webgl, Unicode11, WebLinks, Serialize, but only FitAddon runs. | Webgl, Unicode11, WebLinks, and Serialize addons not loaded. |

## 5.11 Tasks (VS Code task support)

VS Code task support is entirely absent. There is no tasks.json parsing, task runner, problem matchers, auto-detection, grouping, compound tasks, or related infrastructure. The command palette can classify command keywords (build, test, install) from running commands, but that is distinct from a declarative task system. There is no plan to add tasks; vsclaude centers on agent-driven commands in the terminal and event stream, not user task definitions.

| Capability | Status | Evidence | What is missing |
| --- | --- | --- | --- |
| tasks.json file format and loading | Missing | No code parses or loads tasks.json; zero matches. | No tasks.json loader. |
| Task auto-detection (npm scripts, gradle, etc.) | Missing | classify.ts detects keywords on running commands, not pre-run discovery. | No script scanner or build-system detection. |
| Task quick-pick UI and palette integration | Missing | command-registry.ts is generic; no task discovery or definition-file integration. | No task list UI; palette runs registered commands only. |
| Task groups (build, test) and default task | Missing | Classification is post-hoc, not declarative. | No task groups or default task. |
| Compound tasks and dependencies | Missing | Terminal runs one command per command_run event. | No sequencing or dependency declarations. |
| Problem matchers (output parsing into Problems panel) | Missing | Terminal spec states it does not parse output for meaning; no matcher logic in packages/editor/src. | No regex output parsing or error extraction. |
| Background/watch tasks with begin/end patterns | Missing | Long-lived commands run via command_run but with no background designation. | No background flag or began/ended detection. |
| Run, terminate, restart, show-running actions | Partial | ipc.ts pty_kill terminates; store.ts tracks live/exited; pty_create spawns. | No named-task run, show-running UI, or restart action. |
| Input variables and variable substitution | Missing | cwd and env accepted at pty_create only. | No ${input}, ${config}, ${env}, or substitution engine. |
| Task terminal output and result tracking | Partial | PtyExitEvent returns exitCode; store.ts tracks status; output streamed. | No structured task result or task-specific presentation. |

## 5.12 Debugging (Debug Adapter Protocol)

The repository contains no debugging features (DAP, breakpoints, launch.json, debug views, debug console). vsclaude is designed around watching an agent through an event stream, not debugging user code. The only debug-adjacent concept is a debugging Pixie state for agent errors, which is purely a visualization. Debugging is not on the roadmap and aligns with the documented non-goals (a purpose-built agent-watching interface, not a general IDE). This is a complete absence of DAP capabilities.

| Capability | Status | Evidence | What is missing |
| --- | --- | --- | --- |
| Launch configurations (launch.json, compound, picker) | Missing | No launch.json handling across contracts, editor, desktop, or src-tauri; no debug IPC. | No launch config parser or registry. |
| Run and Debug view plus toolbar (continue/step/etc.) | Missing | Panels exist but none is a debug view; terminal shows command events only. | No debug view, controls, or toolbar. |
| Breakpoints (line/conditional/hit-count/logpoints/etc.) | Missing | No breakpoint model in contracts; no gutter decoration; no storage. | No breakpoint types, UI, or protocol. |
| Variables / Watch / Call Stack / Loaded Scripts / Breakpoints views | Missing | Panels are fixed; no debug AgentEvent types. | These debug panels do not exist. |
| Debug console REPL plus completion plus eval hover plus inline values | Missing | TerminalPanel is a PTY; no REPL eval engine; Monaco has no debug features. | No REPL or evaluation. |
| Multi-target / multi-session debug picker | Missing | provider.ts defines provider sessions, not debug targets. | No debug session picker. |
| Auto-attach plus debug terminal for Node plus run-without-debugging | Missing | Terminal runs generic commands; no Node debug mode or auto-attach. | No auto-attach or instrumented run. |
| Disassembly view plus memory view | Missing | No disassembly or memory rendering. | No implementation. |
| Debug status bar coloring plus focused-session indicator | Missing | SettingsBar shows playback controls, not debug status. | No debug session indicator. |
| Debug adapter registration API | Missing | Plugin SDK supports presentation/behavior, not debug adapters. | No debug adapter registration. |

## 5.13 Snippets and Emmet

Monaco 0.55.1 is integrated with basic configuration, and Emmet and snippets are available as Monaco defaults. But there is no user-facing snippet or Emmet functionality: no palette commands for snippet insertion or Emmet, no snippet definition files or loaders, and no snippet configuration UI. The spec describes snippets with TextMate syntax as a planned feature, still unimplemented. Monaco's built-in IntelliSense and default Emmet are technically accessible but not wired into the UI.

| Capability | Status | Evidence | What is missing |
| --- | --- | --- | --- |
| Emmet abbreviation expansion and commands | Partial | Monaco 0.55.1 ships Emmet; EditorPanel.tsx does not disable it; no Emmet commands in CommandRegistry. | No palette entries, keybindings, or customization for Emmet. |
| Built-in and user snippet definitions | Missing | Spec section 10 describes SnippetDef (built-in/user/workspace); no loader, files, or completion provider; only a narration label exists. | No snippet loader, files, storage, or completion registration. |
| Snippet syntax support (TextMate grammar) | Missing | Spec specifies tabstops/placeholders/choices/variables; no parser or provider. | No TextMate snippet parser, tabstop nav, or variable substitution. |
| Snippet management UI and commands | Missing | No snippet insert/edit/create or from-selection commands in App.tsx; no management UI. | No snippet commands, library browser, or preferences. |
| IntelliSense with completion (Monaco default) | Done | EditorPanel.tsx does not disable suggest; TS/JS workers loaded in monaco-setup.ts provide completions. | |

## 5.14 Settings and configuration

Settings support is minimal and aspirational. A basic AppSettings schema exists (state.ts) with defaults frozen in the binary and localStorage persistence in the web renderer. SettingsBar provides UI for theme, presentation mode, reduced motion, and sound. No settings IPC (patch/get/reset/export/import) is wired in the Rust core, defeating the layered scope model. JSON editing, validation, and schema completion are absent. Profiles, language-specific overrides, a configuration contribution API, and full export/import are missing. Only localStorage persistence exists; no OS-backed storage.

| Capability | Status | Evidence | What is missing |
| --- | --- | --- | --- |
| Settings UI (search, categories, modified indicator, reset) | Partial | SettingsBar.tsx has a theme selector and toggles for mode, reduced motion, sound; no search/categories/reset. | No settings panel with search, categories, modified indicators, or reset. |
| Settings JSON editing with completion and validation | Missing | persistence/settings.ts merges/loads but no editing UI or validation. | No JSON editor, generated schema, validation, or key completion. |
| Multi-scope resolution (user/workspace/folder with source) | Missing | state.ts defines a flat AppSettings; spec describes four layers, unimplemented. | No workspace/folder files, scope indicator, precedence, or scope IPC. |
| Language-specific setting overrides | Missing | EditorPanel.tsx hardcodes options; no override mechanism. | No [language] section or per-filetype options. |
| Settings profiles (create/switch/export/import) | Missing | No profile code; PluginContributions has no profiles field. | No profile storage, switching, or bundle export/import. |
| Settings sync across machines | Not planned | SETTINGS_THEMES_PERSISTENCE.md section 13 states no cloud sync; export/import via JSON only. | Cross-machine sync out of scope; manual JSON only. |
| Configuration contribution API with schemas | Missing | PluginManifest contributes lists pixieStates/themes/panels/providers/visualizations; no settings field. | No plugin settings registration or schema merging. |
| Editor settings UI (font, tab size, wrap, minimap, format-on-save) | Partial | EditorPanel.tsx passes hardcoded options (fontSize 13, tabSize 2, minimap on); not user-configurable. | No UI to change editor settings; not in AppSettings; compiled in. |
| Secrets handling with keychain integration | Partial | secrets.rs uses keyring (set/status/delete) with IPC; in-memory fallback in persistence/secrets.ts. | IPC exists but not wired to a settings UI; no key-management panel. |
| Settings persistence (localStorage web, OS store native) | Partial | theme.ts load/save via localStorage; no IPC to Rust for settings. | Native does not persist to OS config; settings patch/reset IPC absent; no atomic write or migration. |

## 5.15 Keybindings and keymaps

vsclaude has a hardcoded global keymap for accessibility (Ctrl/Cmd+K for the palette, Ctrl/Cmd+S for save, and others in ACCESSIBILITY.md) but lacks a keybindings UI, a JSON config system, when-clause evaluation, conflict detection, and importable keymaps. The command palette is the primary keyboard interface, but keybindings are not customizable, discoverable in a settings UI, or persisted. Monaco's keybinding system is not exposed for user customization.

| Capability | Status | Evidence | What is missing |
| --- | --- | --- | --- |
| Global keyboard shortcuts (hardcoded) | Done | CommandPalette.tsx Ctrl/Cmd+K; EditorPanel.tsx Ctrl/Cmd+S; ACCESSIBILITY.md documents the full global keymap. | |
| Command palette as keyboard interface | Done | command-registry.ts fuzzy matching; CommandPalette.tsx open/search/navigate/run. | |
| Keybindings editor / settings UI | Missing | SettingsBar.tsx manages mode/theme/motion/sound only; no keybindings section. | No UI to view, search by key, or edit shortcuts. |
| Keybindings JSON format and persistence | Missing | AppSettings has no keybindings field; no keybindings.json. | No schema, file, or persistence; no export. |
| When-clause context evaluation | Missing | CommandRegistry.register has no when field; no context filtering. | No when-clause evaluator or conditional bindings. |
| Chord bindings (multi-key sequences) | Missing | Only a single Ctrl+K chord; no chord support in the registry. | No multi-key or prefix sequences. |
| Per-key conflict detection | Missing | No conflict logic in CommandRegistry. | No detection or warning for duplicate bindings. |
| Importable keymaps (Vim/Sublime/IntelliJ) | Missing | No preset loader; plugin API has no registerKeybindings. | No presets or keybinding contributions. |
| Printable shortcuts reference / help | Partial | ACCESSIBILITY.md documents the keymap; palette is the discovery mechanism. | No in-app help overlay or printable reference. |
| Record-keys helper | Missing | No record/capture mode found. | No key-recording mode. |
| Monaco editor keybinding customization | Partial | EditorPanel.tsx uses addCommand for save; Monaco has its own system. | Monaco keys not integrated with settings or persistence; users cannot customize. |

## 5.16 Themes and appearance

vsclaude has a strong design-token system and bundled themes, but many appearance customizations in the spec are unimplemented. The current build provides theme selection (four bundled themes plus a plugin API for custom themes), accessibility modes (high-contrast, color-blind-safe, reduced-motion), and fixed editor font settings. It lacks user-configurable font size, line height, ligature toggle, UI scale, system-theme following, token color customization, and workbench color customization. Monaco's theme and options are hardcoded.

| Capability | Status | Evidence | What is missing |
| --- | --- | --- | --- |
| Bundled color themes (dark, light, high-contrast, color-blind-safe) | Done | design-tokens.ts defines four themes; theme-registry.ts seeds them; SettingsBar.tsx picker. | |
| Theme selection and live preview UI | Done | SettingsBar.tsx select updates AppSettings; theme.ts applyTheme() sets CSS variables. | |
| Plugin theme contribution API | Done | plugin-api.ts registerTheme; host.ts getTheme/listThemeIds; define.ts helper. | |
| Accessibility: reduced motion mode | Done | state.ts reducedMotion; SettingsBar.tsx toggle; resolve-theme.ts upgrades to high-contrast. | |
| Accessibility: color-blind-safe theme | Done | design-tokens.ts colorBlindSafeTheme; state.ts flag; resolve-theme.ts prioritizes it. | |
| CSS variable theme system | Done | css-variables.ts themeToCssVariables/themeToCssText; theme.ts applies to document root. | |
| File icon themes | Missing | No fileIcon/iconTheme implementation in apps/desktop/src or contracts. | No icon theme support, picker, or registration. |
| Product icon themes | Missing | No productIcon references in source or design system. | No product icon theme or API. |
| Token color customization and semantic token theming | Missing | design-system handles bundled themes; registration accepts full themes only; no tokenColor field. | No per-token overrides. |
| Workbench color customization | Missing | No workbench customization UI or API; AppSettings has themeId only. | No workbench color overrides. |
| Editor font size customization | Partial | EditorPanel.tsx hardcodes fontSize 13; spec mentions 8 to 32. | No AppSettings field or UI; hardcoded. |
| Editor font family customization | Partial | EditorPanel.tsx hardcodes fontFamily; no override field. | Not user-configurable. |
| Editor font ligatures toggle | Partial | EditorPanel.tsx hardcodes fontLigatures true. | No user toggle. |
| Editor line height customization | Missing | No lineHeight option or AppSettings field. | No line-height customization. |
| Editor font weight customization | Missing | No fontWeight option or field. | Not customizable. |
| Editor wheel/scroll zoom | Missing | No explicit Ctrl+Scroll zoom feature or UI. | Not exposed or documented. |
| Editor tab size and indentation settings | Partial | EditorPanel.tsx hardcodes tabSize 2; spec mentions 1 to 8 and insertSpaces. | No AppSettings fields; not configurable. |
| Editor word wrap setting | Missing | wordWrap not passed; spec mentions off/on/bounded. | Not in AppSettings or options. |
| Editor minimap visibility | Partial | EditorPanel.tsx hardcodes minimap enabled. | No toggle setting. |
| Follow OS system theme | Missing | Spec mentions followSystemTheme; not in AppSettings; no OS listener. | No OS theme detection or auto switch. |
| UI scale customization | Missing | Spec mentions uiScale 0.8 to 1.5; no field or zoom UI. | No UI scale setting. |
| Monaco editor theme binding to app theme | Missing | EditorPanel.tsx hardcodes vs-dark; ignores AppSettings.themeId. | Monaco stays dark when app theme changes; no binding. |
| Custom theme file import/export | Missing | Spec describes JSON themes with validation; no import/export; plugin themes runtime-only. | No custom theme file create/import/export. |

## 5.17 Extensions and plugin ecosystem

The plugin system has a complete, well-designed API contract and host (plugin-sdk, contracts) but virtually no UI or desktop integration. The PluginHost validates, loads, activates, and manages lifecycles, registering themes, panels, Pixie states, visualizations, and providers. But there is no discovery, on-disk loading, marketplace, extensions view, install UI, enable/disable, per-workspace enablement, or higher-level management in the renderer. This is intentional: the roadmap lists these as planned follow-up.

| Capability | Status | Evidence | What is missing |
| --- | --- | --- | --- |
| Plugin API contract and schema | Done | plugin-api.ts defines plugin, manifest, context, definitions; PLUGIN_API_VERSION 1; PLUGIN_SDK.md. | |
| Plugin host runtime (activate, deactivate, validation) | Done | host.ts register/unload with rollback; validation.ts; tests cover lifecycle and duplicates. | |
| Plugin contribution registration (themes/panels/states/visualizations/providers) | Done | PluginContext register* methods; host.ts implements all five with disposers; tested. | |
| Plugin manifest and package.json integration | Done | PluginManifest fields; validation.ts checks namespaced id/version/apiVersion; dual declaration in spec. | |
| Plugin storage and logging | Done | PluginContext.storage and log; host.ts namespaced map and log array. | |
| Extension host isolation from renderer | Partial | Spec describes worker isolation; plugin-sdk is pure TS; no worker in apps/desktop/src. | No worker thread or host-to-worker IPC. |
| Plugin discovery and loading from disk | Missing | No plugin-loading code in src-tauri or apps/desktop/src; SDK has no file I/O. | No directory scanning, manifest read, dynamic import, or hot reload. |
| Extensions marketplace and registry UI | Missing | No extensions view or marketplace; SettingsBar shows bundled themes only. | No marketplace, browse, or registry UI. |
| Plugin install/uninstall/update UI | Missing | No lifecycle UI or copy mechanism in apps/desktop/src. | No install/uninstall/update UI. |
| Per-workspace enablement and recommendations | Missing | Spec describes workspace plugins and trust prompts; no code. | No workspace discovery, trust logic, or recommendations. |
| Pre-release channels and dependency resolution | Missing | No version channels or dependency resolution in manifest or host. | No channels or plugin-to-plugin deps. |
| Plugin settings contributions and activation events | Missing | PluginContributions lacks settings and activation events. | No settings contributions or lazy activation. |
| Theme picker with plugin themes | Partial | SettingsBar.tsx uses bundledThemeIds; PluginHost has listThemeIds but is never instantiated. | No wiring of plugin themes into the selector. |
| Runtime integration of plugin panels | Missing | host.ts getPanel exists; App.tsx mounts hardcoded panels with no plugin resolution. | No dynamic panel mounting from PluginHost. |
| Runtime integration of plugin visualizations | Missing | host.ts getVisualization exists; SwarmPanel.tsx has no plugin hook. | No runtime visualization swapping. |
| Runtime integration of plugin Pixie states | Missing | host.ts getPixieState exists; PixieStage.tsx has no plugin bridge. | No custom Pixie state routing. |
| Runtime integration of plugin providers | Missing | host.ts getProvider exists; providers/registry.ts manages built-ins; no integration. | No plugin provider wiring or permission prompt. |
| Example plugins (end-to-end) | Missing | No example plugin packages; spec examples are illustrative only. | No buildable, loadable example plugin. |

## 5.18 Notebooks

vsclaude has no notebook editor or interactive window. The codebase recognizes NotebookEdit as a tool name (mapped to file_edit events), but there is no notebook UI, kernel system, cell execution model, output rendering, or REPL. Notebook files, if opened, are treated as plain text. The terminal is a shell PTY, not a kernel. Notebook support is entirely absent.

| Capability | Status | Evidence | What is missing |
| --- | --- | --- | --- |
| Notebook editor (code plus markdown cells, add/move/split/merge) | Missing | Tab kinds are file/diff/agent-diff/welcome; tabs.ts has path/label only; no cell model. | No notebook component, cell model, or cell operations. |
| Kernel selection and cell execution (run/interrupt/restart) | Missing | No kernel registry; NotebookEdit maps to file_edit; terminal is a PTY, not a kernel. | No kernel layer, execution events, or selection UI. |
| Rich outputs (text/images/HTML/interactive, scrolling/clearing) | Missing | No output renderer infrastructure; monaco-setup.ts configures language workers only. | No output pane, MIME renderers, or clearing/scrolling. |
| Notebook diff and variable view | Missing | Diff editor targets file diffs; inspector.ts is event drill-down, not variables. | No notebook diff or variable inspector. |
| Interactive window / REPL | Missing | Terminal is a PTY for shell interaction; no cell input/output pairing. | No REPL, cell history, or kernel protocol. |
| Custom renderer and kernel API | Missing | No notebook renderer or kernel plugin API in plugin-sdk. | No renderer or kernel registration API. |

## 5.19 Remote development and tunnels

vsclaude has no remote development or tunnel support. The project is deliberately scoped to local-only development in Phases 0 to 3. The Rust PTY is local-only by design, documented as a non-goal for v1. No SSH, dev containers, WSL, or tunnel implementations exist. Workspace filesystem operations support only absolute local paths via the Rust core. Remote development is not on the published roadmap.

| Capability | Status | Evidence | What is missing |
| --- | --- | --- | --- |
| Remote over SSH | Missing | No SSH code; PTY uses local ConPTY; 'ssh' in actions.ts is an agent action label, not IDE SSH. | No SSH transport, remote shell, key management, or remote mount. |
| Dev containers and WSL support | Missing | No devcontainer or WSL code; filesystem uses local std::fs. | No devcontainers.json, WSL translation, or container runtime. |
| Secure tunnels and port forwarding | Missing | TERMINAL_SPEC.md states no remote terminals or network listener in v1. | No tunnel creation, port forwarding, or mapping. |
| Remote explorer and connect flow | Missing | WorkspaceExplorer operates on the local filesystem; ipc.ts has only local commands. | No host picker, connection settings, or remote browser. |
| Workbench against remote filesystem | Missing | fsClient.ts and useWorkspace use local fs.* IPC; editor binds local docs. | No remote path abstraction, URI scheme, or buffering. |
| Remote terminal and shell execution | Missing | pty.rs creates local PTYs; pty.create accepts only local params. | No remote PTY, command execution, or multiplexing. |

## 5.20 Accessibility (full)

The repository implements foundational accessibility but remains incomplete against ACCESSIBILITY.md. Screen reader support exists (aria-live narration, semantic ARIA roles across regions); keyboard operability is partially in place (roving tabindex in the explorer, tab bars, palette); visual accessibility has basics (focus rings, reduced-motion media query, three accessibility-aware themes including high-contrast). But the packages/a11y package (narrator, announcer, focus helpers, prefs) is not implemented, leaving per-verbosity narration, live-region debouncing, focus-trap utilities, and full preference resolution missing. Testing gates (axe CI, narrator unit tests, keyboard e2e) and several keyboard features are absent.

| Capability | Status | Evidence | What is missing |
| --- | --- | --- | --- |
| Screen reader labeling and ARIA roles | Partial | Narration.tsx aria-live; WorkspaceExplorer.tsx tree roles; WorkspaceEditor.tsx tablist roles; CommandPalette.tsx dialog; panels aria-label. | No aria-describedby for dialogs, full swarm narration labels, or progress aria-valuenow/valuetext. |
| Narrated event stream with live region | Partial | Narration.tsx aria-live region plus log; useSession.ts maps events through captionFor(); captions.ts templates. | No a11y narrator package, per-verbosity generation, debounce/dedupe, assertive routing, or narrator tests. |
| Full keyboard operability with visible focus | Partial | focus-visible ring in styles.css; Ctrl/Cmd+K; explorer and tab-bar roving; context-menu escape. | No F6 region cycling, Alt+Z/Alt+H, Ctrl/Cmd+., keyboard pane-resize, focus trap, or help dialogs. |
| Reduced-motion mode with meaning preserved | Partial | styles.css honors prefers-reduced-motion; App.tsx sets data-reduced-motion; theme.ts resolves to high-contrast; toggle persists. | No Rive/sprite pausing, guaranteed state labels, collapsed motion tokens, or CI motion tests. |
| High-contrast and color-blind-safe themes | Done | design-tokens.ts defines both; resolve-theme.ts forces them; App.tsx and SettingsBar.tsx apply and toggle. | |
| No information by color alone | Partial | Status uses color plus icon; diff uses +/- prefixes; dirty marker has dot plus sr-only label; swarm uses icon plus label. | No CVD simulation tests, verified high-contrast opaque overlays, or enforced icon-plus-shape-plus-text rules. |
| Scalable UI respecting OS text size and zoom | Partial | rem units throughout; grid/flex reflow; sr-only clip technique; theme.ts sets document font-size. | No uiScale setting or control; no 200% zoom or text-spacing tests. |
| Focus management with roving tabindex and restoration | Partial | WorkspaceExplorer.tsx and WorkspaceEditor.tsx implement roving tabindex; CommandPalette list selection. | No reusable roving/focus-trap hooks, modal focus restore, or per-mode focus order. |
| Keyboard alternatives to drag-and-drop | Partial | WorkspaceExplorer.tsx drag-drop exists; a comment notes keyboard equivalent as future work. | No keyboard move/resize bindings or documented drag alternatives. |
| Audio cues and signals (optional) | Partial | App.tsx sound toggle; SettingsBar.tsx button; SoundSettings flag. Infrastructure is a stub. | No Tone.js cues, per-signal config, or non-visual channel for permissions/errors. |
| Accessibility preferences persisted and OS-aware | Partial | AppSettings has reducedMotion, colorBlindSafe, sound; theme.ts persists; resolve-theme.ts respects them. | No a11y prefs hook with OS media queries, resolution order, narration verbosity, uiScale, or forced-colors handling. |
| Accessibility testing and CI gates | Missing | addon-a11y present but no axe-core, vitest-axe, narrator, focus, or keyboard e2e tests. | No axe integration, contrast checker, narrator tests, announcer tests, keyboard/reduced-motion e2e, CVD snapshots, or reflow tests. |
| Permission request dialog accessibility | Missing | No permission dialog component; DiffReview has role='dialog' but no permission safety pattern. | No alertdialog, aria-modal, focus trap/restore, safe default focus, or assertive narration with tool/inputs. |
| ARIA patterns for chat, terminal, editor, swarm | Partial | Terminal section aria-label; editor tablist/tab/tabpanel/status; swarm cards with status labels. | No chat live region, terminal screen-reader mode, swarm tree hierarchy, diff line-count labels, or token meter values. |
| Narration log panel accessible history (Ctrl+.) | Missing | Narration.tsx shows a caption plus log but not a separate drawer; no Ctrl/Cmd+. command; entries are strings. | No log panel with role='log' and timestamps, Ctrl/Cmd+. command, or jump-to-event rows. |
| Accessible keyboard help and context-sensitive help | Missing | Palette lists commands but there is no dedicated help or a11y help dialog. | No help dialog listing committed commands or context-sensitive help per region. |

## 5.21 Productivity and workspace lifecycle

The repository implements a substantial subset of productivity features. Core capabilities (manual save, save-all, dirty tracking, workspace root management) work through useWorkspace.ts. Toast notifications for errors are present. Recent projects persistence and a Timeline exist. Several features are spec-deferred or missing: workspace trust and restricted mode, auto-save, hot exit and crash recovery, untitled editors and scratchpad, output channels, a problems panel, and onboarding (welcome page, walkthroughs, what-is-new). Progress indicators exist via the UI but cancellation APIs are minimal.

| Capability | Status | Evidence | What is missing |
| --- | --- | --- | --- |
| Manual save, save-all, save on focus/window change | Partial | useWorkspace.ts save()/saveAll(); App.tsx save-all command; no auto-save listeners in monaco-setup.ts. | No auto-save on focus or window change; no debounce timer. |
| Dirty tracking and visual indicators | Done | useWorkspace.ts OpenDoc.dirty; setDraft() updates the flag; explorer and tabs show markers. | |
| Workspace trust and restricted mode | Missing | Specs mention a trust model; no implementation in useWorkspace.ts, fsClient.ts, or config. | No trust prompt, restricted mode, or permission enforcement. |
| Hot exit with session restoration, backup, recovery | Missing | useWorkspace.ts restores root paths only; no hot-exit, backup, or recovery. | No backup before close, crash detection, or recovery of tabs/edits. |
| Local history per file in Timeline (restore/compare) | Partial | TimelinePanel.tsx and chat/timeline.ts build from events; session.ts checkpoints can restore by index. | No per-file edit history, file undo/redo UI, or restore-to picker. |
| Open recent projects list | Done | useWorkspace.ts loads/saves recents; App.tsx registers a command per recent; capped and de-duped. | |
| New window and duplicate workspace | Missing | No New Window or Duplicate Workspace command; single-window architecture. | No new-window or duplicate-workspace feature. |
| Window restore and open tabs persistence | Partial | useWorkspace.ts persists open roots across reloads. | No tab order, splits, active editor, or view state restored. |
| Untitled editors and scratchpad | Missing | useWorkspace.ts requires real paths; no scratchpad; App.tsx hardcodes a demo file. | No untitled model, scratchpad, or temp editing surface. |
| Error/info/warning notifications (toasts) | Done | App.tsx workspace-toast role='alert'; useWorkspace.ts error state and clearError; styles.css. | |
| Notification center / history | Missing | Toast dismisses with no history; no center component. | No persistent notification log or drawer. |
| Progress indicators and cancellation | Partial | SettingsBar progress indicator; Pixie state transitions; session pause/restart in App.tsx. | No general progress API or cancellation token; cannot cancel in-flight operations. |
| Output channels with log level filtering | Missing | TerminalPanel shows agent command output; no per-channel logging or level UI. | No output channel abstraction or filtering. |
| Problems panel with filtering | Partial | ProblemsPanel.tsx aggregates and groups diagnostics by file (see 5.5 and 5.2). | No filtering by severity or by text yet. |
| Welcome page and Get Started walkthroughs | Missing | ONBOARDING_AND_DELIGHT.md specifies a wizard; no renderer implementation; app shows a demo session. | No welcome screen, wizard, or step guide. |
| What-is-new and release notes | Missing | No release-notes UI, version tracking, or changelog component. | No release notes or version-aware UI. |
| General progress API with cancellation tokens | Missing | No CancellationToken type or general progress callback; cancellation is task-specific. | No standardized progress/cancellation abstraction. |

## 5.22 Custom editors, webviews, and previews

The repository shows minimal custom-editor and webview capability. It supports only text-based Monaco editing with language-specific highlighting. There are no custom document models, backup systems, webview messaging, content security policies, image/SVG/audio/video previewers, hex/binary viewers, or custom data contributions. The agent-edit and diff surface (spec section 11) is designed but the code shows only basic edit visualization with text diffs. Preview tabs exist in the spec but the implementation has basic tab management without preview semantics.

| Capability | Status | Evidence | What is missing |
| --- | --- | --- | --- |
| Custom editor API (document model plus backup) | Missing | No DocumentModel, CustomEditor, or backup interfaces; EditorPanel.tsx wraps Monaco with language detection only. | No document model, backup/autosave, registration, or binary editor. |
| Webview API (messaging, state, CSP) | Missing | No webview or messaging infrastructure; ipc.ts has only file/fs/session/pty channels. | No webview creation, message passing, state, CSP, or events. |
| Image preview (inline plus viewer) | Missing | ExplorerPanel handles the tree; EditorPanel dispatches to Monaco by extension only. | No image rendering, zoom/pan, or dimensions. |
| SVG viewer (zoom/pan) | Missing | No SVG rendering; LANG_BY_EXT has no SVG entry. | No SVG render, zoom/pan, or metadata. |
| Audio/video media player | Missing | No media elements or handlers in components or panels. | No audio/video player or controls. |
| Hex viewer and binary editor | Missing | EditorPanel renders text only; no binary handlers. | No hex dump, byte editing, or endianness toggle. |
| Custom data contribution (HTML/CSS) | Missing | No customData files; plugin contributions list states/themes/panels/providers/visualizations only. | No HTML/CSS schema contribution or validation. |
| Preview tabs (single-click ephemeral) | Partial | Spec 5.2 specifies them; tabs.ts has no preview field; WorkspaceEditor.tsx has basic tab management. | No preview state, italic styling, replacement, or promotion. |
| Built-in language syntax highlighting (Monaco default) | Done | monaco-setup.ts loads workers; EditorPanel.tsx LANG_BY_EXT; Monaco bundles grammars. | |
| Diff editor (side-by-side and inline) | Partial | DiffReview.tsx parses git diff text into add/remove/context/hunk; no Monaco diff editor or mode toggle. | No Monaco diff wrapper, mode toggle, navigation, counter, ruler, or per-hunk UI. |

## 5.23 Performance, logging, diagnostics, updates

The repository has extensive performance specification (PERFORMANCE_BUDGETS.md with a budget table, measurement methods, and CI gates) and documented cold-start infrastructure. But implementation of the diagnostics and monitoring systems is largely unbuilt. Performance marks and measures do not exist in code; structured logging with levels and on-disk logs is absent; telemetry opt-in is declared in settings but has no collection or sending; crash reporting is missing; and auto-update is not wired (the updater plugin is not added to Tauri). The app ships a clear budget spec but lacks the observability and update mechanisms to enforce it.

| Capability | Status | Evidence | What is missing |
| --- | --- | --- | --- |
| Cold start plus startup performance markers | Partial | PERFORMANCE_BUDGETS.md sections 4/12 specify budgets and method; BUILD.md describes the start path; no performance.mark in main.tsx or App.tsx. | No User Timing instrumentation, frame sampler harness, or cold-start CI gate. |
| Structured logging with levels plus on-disk logs plus troubleshooting | Missing | No logging library, levels, sinks, or persistence; only tauri-plugin-dialog configured. | No structured logger, log-level setting, disk rotation, report flow, or diagnostics panel. |
| Privacy-respecting opt-in telemetry plus clear setting | Partial | state.ts telemetry false by default; AppSettings declares it; test confirms default. | No collection, transmission, UI toggle, or opt-in flow. |
| Auto-update with channels plus restart-to-update | Missing | BUILD.md notes the updater needs tauri-plugin-updater, which is not in Cargo.toml; no update logic or UI. | No updater dependency, registration, version check, download/install, notification, restart, or channels. |
| Crash reporting respecting telemetry setting | Missing | No crash reporting integration; no error boundary or Rust panic handler. | No crash service, capture, conditional sending, panic hook, or symbolication. |
| Process explorer plus renderer/extension-host load inspection | Missing | No process explorer UI; TimelinePanel has an event inspector, not process metrics; no metrics command. | No memory/CPU display, process metrics, watcher counts, or GPU resource counts. |
| Performance budget measurement and CI gates | Partial | PERFORMANCE_BUDGETS.md section 13 specifies budgets and gates; ci.yml has only lint/typecheck/test/build. | No bundle-size analyzer, jank or frame-sampler harness, or nightly performance job. |
| Profiling flow (dev tools, flame graphs, memory snapshots) | Missing | Spec section 12 describes manual procedures; no automated tooling or CI profiling. | No automated heap snapshots, flame graphs, frame sampler, Long Task/Event Timing observers, or regression alerting. |

## How to use this matrix

This matrix drives the rest of the parity build. Only Partial and Missing items become specs and slices; Done and Not planned items are not picked up as work (Not planned items are revisited only if the phase scope changes). Re-read the relevant section before starting each slice so the slice targets the exact gap recorded here, not a stale memory of it. Mark an item Done only when it is fully implemented, tested, accessible, integrated into the running app, and documented; anything short of all five stays Partial. When an item moves to Done, update both its row and the roll-up so the totals stay honest.
