/**
 * Frozen version constants for the vsclaude contracts.
 *
 * These numbers gate compatibility across the whole system. Bump them
 * deliberately and document the migration in the relevant spec when the
 * shape of a contract changes.
 */

/** Version of the {@link AgentEvent} schema. Adapters stamp this on every event. */
export const AGENT_EVENT_SCHEMA_VERSION = 1 as const;

/** Version of the IPC protocol between the Rust core and the renderer. */
export const IPC_PROTOCOL_VERSION = 1 as const;

/** Version of the public plugin API surface. Plugins declare the version they target. */
export const PLUGIN_API_VERSION = 1 as const;

/** Semantic version of the contracts package itself. */
export const CONTRACTS_VERSION = '0.1.0' as const;
