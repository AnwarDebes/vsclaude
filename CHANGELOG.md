# Changelog

All notable changes to vsclaude are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
