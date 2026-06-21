/**
 * The AgentEvent: the single normalized event that every provider is mapped
 * into, and the only thing the visual layer ever consumes.
 *
 * This is the most important contract in the codebase. Claude Code, Codex,
 * Gemini, and Ollama each get a thin adapter that translates their native
 * output into a stream of AgentEvents. The mascot engine, the activity
 * timeline, the swarm view, and the chat panel all read AgentEvent and nothing
 * else, so swapping a provider just works.
 *
 * Sacred rule 2 lives here: `raw` always carries the untouched provider event,
 * so meaning is always recoverable with one drill-down.
 */
import { AGENT_EVENT_SCHEMA_VERSION } from './version.js';

/**
 * The closed set of normalized event types. Adding a new type is a deliberate,
 * versioned change because the entire visual layer keys off this union.
 */
export type AgentEventType =
  | 'session_start'
  | 'session_end'
  | 'thinking' // reasoning or planning text
  | 'message' // assistant text addressed to the user
  | 'tool_call' // the agent invoked a tool
  | 'tool_result' // a tool returned a result
  | 'file_read'
  | 'file_edit'
  | 'file_create'
  | 'file_delete'
  | 'command_run'
  | 'command_output'
  | 'search' // grep, glob, or web search
  | 'web_fetch'
  | 'git_action'
  | 'subagent_spawned' // orchestration: a worker was delegated to
  | 'subagent_finished'
  | 'todo_update' // plan or checklist changed
  | 'permission_request' // the agent wants to do something gated
  | 'token_usage' // running cost and context accounting
  | 'error'
  | 'complete';

/** Every known event type, in lifecycle-ish order. Useful for validation and UI. */
export const AGENT_EVENT_TYPES: readonly AgentEventType[] = [
  'session_start',
  'session_end',
  'thinking',
  'message',
  'tool_call',
  'tool_result',
  'file_read',
  'file_edit',
  'file_create',
  'file_delete',
  'command_run',
  'command_output',
  'search',
  'web_fetch',
  'git_action',
  'subagent_spawned',
  'subagent_finished',
  'todo_update',
  'permission_request',
  'token_usage',
  'error',
  'complete',
];

/** The set of providers shipped in the box. The union stays open for plugins. */
export type KnownProvider = 'claude-code' | 'codex' | 'gemini' | 'ollama';
export type ProviderId = KnownProvider | (string & {});

/** A tool invocation reference attached to tool_call and tool_result events. */
export interface ToolRef {
  /** Tool name, for example `Edit`, `Bash`, `Grep`. */
  name: string;
  /** The tool input exactly as the provider supplied it. */
  input: unknown;
  /** Correlates a tool_call with its tool_result when the provider supplies an id. */
  toolUseId?: string;
}

/**
 * The normalized event. Field meanings:
 * - `id`         globally unique within a session, monotonic where possible.
 * - `sessionId`  the user session this belongs to.
 * - `agentId`    which agent emitted it (orchestrator vs worker N).
 * - `parentAgentId` the delegating agent, present for spawned workers.
 * - `ts`         epoch milliseconds. Adapters supply this; the core never invents it.
 * - `type`       the normalized event type.
 * - `provider`   which adapter produced it.
 * - `schemaVersion` stamped from {@link AGENT_EVENT_SCHEMA_VERSION}.
 * - `tool`       present for tool_call and tool_result.
 * - `payload`    the structured detail (file path, query, diff, command, and so on).
 * - `caption`    a plain-language summary for humans (sacred rule 3).
 * - `raw`        the untouched provider event for full drill-down (sacred rule 2).
 */
export interface AgentEvent {
  id: string;
  sessionId: string;
  agentId: string;
  parentAgentId?: string;
  ts: number;
  type: AgentEventType;
  provider: ProviderId;
  schemaVersion: number;
  tool?: ToolRef;
  payload?: Record<string, unknown>;
  caption?: string;
  raw?: unknown;
}

/** Input accepted by {@link createAgentEvent}: everything but the stamped version. */
export type AgentEventInput = Omit<AgentEvent, 'schemaVersion'> & {
  schemaVersion?: number;
};

/**
 * Build a well-formed AgentEvent, stamping the current schema version.
 *
 * This function is pure on purpose: callers pass `id` and `ts` so the contract
 * layer never depends on a clock or a random source. That keeps the schema
 * deterministic and trivially testable.
 */
export function createAgentEvent(input: AgentEventInput): AgentEvent {
  return {
    ...input,
    schemaVersion: input.schemaVersion ?? AGENT_EVENT_SCHEMA_VERSION,
  };
}

/** Narrow an arbitrary string to a known AgentEventType. */
export function isAgentEventType(value: string): value is AgentEventType {
  return (AGENT_EVENT_TYPES as readonly string[]).includes(value);
}

/** Runtime guard: is this value a structurally valid AgentEvent? */
export function isAgentEvent(value: unknown): value is AgentEvent {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.sessionId === 'string' &&
    typeof e.agentId === 'string' &&
    typeof e.ts === 'number' &&
    typeof e.provider === 'string' &&
    typeof e.type === 'string' &&
    isAgentEventType(e.type)
  );
}

/** True when the event belongs to a delegated worker rather than the root agent. */
export function isWorkerEvent(event: AgentEvent): boolean {
  return typeof event.parentAgentId === 'string' && event.parentAgentId.length > 0;
}
