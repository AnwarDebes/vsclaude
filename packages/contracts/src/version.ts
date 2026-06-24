/**
 * Frozen version constants for the vsclaude contracts.
 *
 * These numbers gate compatibility across the whole system. Bump them
 * deliberately and document the migration in the relevant spec when the
 * shape of a contract changes.
 */

/** Version of the {@link AgentEvent} schema. Adapters stamp this on every event. */
export const AGENT_EVENT_SCHEMA_VERSION = 1 as const;

/**
 * Version of the IPC protocol between the Rust core and the renderer.
 *
 * v2 (Phase A1): added the filesystem mutation surface (createFile, createDir,
 * rename, delete, copy, stat), gave readFile/writeFile an mtimeMs for conflict
 * detection, and implemented the previously declared watch/unwatch commands. See
 * specs/WORKSPACE_AND_FILES.md.
 *
 * v3: replaced the cleartext `secret.get` with `secret.status`, which returns
 * only a configured flag and a masked hint. No command returns a raw key. See
 * specs/SECURITY.md.
 *
 * v4: added `fs.walk`, a recursive file index that powers quick-open (Ctrl or Cmd
 * plus P) and, later, project search. It skips heavy directories, never follows a
 * symlink, and caps its result so a huge tree cannot hang the picker. See
 * specs/QUICK_OPEN.md.
 *
 * v5: added `search.find`, project-wide search backed by the `ignore` and `grep`
 * crates (the libraries ripgrep is built from): gitignore-aware, with regex,
 * case, and whole-word options and include and exclude globs. See specs/SEARCH.md.
 */
export const IPC_PROTOCOL_VERSION = 5 as const;

/** Version of the public plugin API surface. Plugins declare the version they target. */
export const PLUGIN_API_VERSION = 1 as const;

/** Semantic version of the contracts package itself. */
export const CONTRACTS_VERSION = '0.1.0' as const;
