# Changelog

All notable changes to vsclaude are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-06-25

The first public beta. On top of the Phase 0 foundation, vsclaude became a real,
usable native IDE: a Monaco-based editor surface with a deep, VS-Code-shaped
feature set, all driven by the frozen `AgentEvent` contract and a Rust core.

### Added

- **Workspace and files**: open-folder workspaces, a lazy file tree with full CRUD
  and drag-drop, multi-root support, recent projects, an external-change watcher,
  an Open Editors view, auto-reveal of the active file, and a `files.exclude`
  noise filter.
- **Editor**: the full Monaco editing command surface (line ops, multi-cursor,
  case transforms, comments, fold, format, find and replace) and configurable
  settings for font, cursor, scrolling, indentation, whitespace, rulers, minimap,
  guides, bracket colorization and auto-closing, folding, and sticky scroll, all
  exposed through a Settings panel and JSON editor.
- **Navigation**: a unified command palette and quick-open (commands, files,
  go-to-line, `@` symbols, `#` workspace symbols), breadcrumbs, an outline view
  for Markdown and code, and keyboard-shortcut and keymap references with per-key
  conflict detection.
- **Search**: project-wide, gitignore-aware ripgrep search with regex, case,
  whole-word, and glob filters, plus search history.
- **Source control**: stage and commit, branches, stash, tags, remotes, history,
  revert, amend, push/pull/fetch, a diff review, and add-to-gitignore.
- **Terminal**: tabbed xterm terminals on a real Rust PTY, with find, links,
  rename, a context menu, and exit-code reporting.
- **Tasks**: `package.json` and `.vscode/tasks.json` detection, task groups, a
  default build task, variable substitution, and `dependsOn` task chains.
- **Previews and viewers**: image (raster and SVG) with zoom, rotate, pan, and
  dimensions; an audio and video media player; Markdown preview; a hex viewer; and
  CSS color decorators (hex, rgb, hsl, and named colors).
- **Workbench and productivity**: an activity bar with badges, a menu bar, a
  status bar, a Problems panel with filtering, an Output panel with channels and
  levels, a notification center with toasts, untitled scratchpads, zen mode, a
  process-info panel, a welcome page, and release notes.
- **Themes and accessibility**: bundled themes with a Monaco theme binding, follow
  OS theme, UI scale, theme export, a narrated event-log panel, and an
  accessibility help dialog.

### Changed

- Released as a public **beta** (was an internal alpha foundation).
- Many editor behaviors that previously relied on Monaco defaults are now explicit,
  configurable settings.
- The production renderer build no longer emits source maps into the installer.

### Fixed

- The git review-and-commit flow, the integrated terminal, and Run Task now use the
  open workspace folder as their working directory (previously the app process cwd,
  which was wrong in a packaged build).
- First-run guidance: the Welcome page greets the native app when no folder is open,
  and File menu actions that need a workspace now explain themselves instead of
  silently doing nothing.

[0.2.0]: https://github.com/AnwarDebes/vsclaude/releases/tag/v0.2.0

## [0.1.0] - 2026-06-21

The Phase 0 foundation.

### Added

- Frozen `@vsclaude/contracts`: the `AgentEvent` schema and typed payloads, the
  IPC protocol, the provider adapter contract, the Pixie motion shapes and the
  `EVENT_TO_STATE` table, the design-token system with four bundled themes, the
  plugin API, and shared application state.
- The full specification set: 27 documents in `specs/` covering vision,
  architecture, the event schema, providers, the mascot system, the swarm view,
  the design system, the editor, terminal, git, chat, MCP, permissions, context
  and checkpoints, settings, sessions, cost, onboarding, accessibility, sound, the
  plugin SDK, testing, performance, security, build and distribution, and CI.
- Twelve packages with real initial domain logic and full unit tests:
  `design-system`, `core-shell`, `editor`, `terminal`, `agent-runtime`,
  `providers`, `motion`, `swarm`, `chat`, `git`, `persistence`, and `plugin-sdk`.
- The desktop application: a Tauri 2 shell with a Rust core (filesystem and
  OS-keychain commands) and a React 19 renderer with an animated first-run demo
  that drives Pixie from a real `AgentEvent` stream.
- Repository foundation: README with banner, ROADMAP, CONTRIBUTING, code of
  conduct, security policy, issue and pull-request templates, and CI workflows.

[0.1.0]: https://github.com/AnwarDebes/vsclaude/releases/tag/v0.1.0
