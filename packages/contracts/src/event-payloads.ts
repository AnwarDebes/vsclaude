/**
 * Typed payload shapes for each AgentEventType.
 *
 * The base {@link AgentEvent} keeps `payload` loose (a record) so adapters can
 * always emit something even before a payload shape is finalized. These payload
 * types document and type the expected shape per event type, and
 * {@link AgentEventPayloadMap} lets consumers narrow safely.
 *
 * These are declared as `type` aliases rather than `interface` on purpose: a
 * type alias is assignable to `Record<string, unknown>`, so an adapter can set
 * `event.payload = someTypedPayload` without a cast. An interface would not be.
 */
import type { AgentEventType } from './agent-event.js';

export type SessionLifecyclePayload = {
  cwd?: string;
  model?: string;
  provider?: string;
};

export type ThinkingPayload = {
  /** The reasoning or planning text, possibly streamed in chunks. */
  text: string;
  /** True while more of this thought is still arriving. */
  partial?: boolean;
};

export type MessagePayload = {
  text: string;
  partial?: boolean;
};

export type ToolCallPayload = {
  name: string;
  input: unknown;
  toolUseId?: string;
};

export type ToolResultPayload = {
  toolUseId?: string;
  output: unknown;
  isError?: boolean;
};

export type FilePayload = {
  path: string;
  /** Detected language id, for example `typescript`. */
  language?: string;
  bytes?: number;
};

export type FileEditPayload = FilePayload & {
  /** A unified diff string when available. */
  diff?: string;
  additions?: number;
  deletions?: number;
};

export type CommandRunPayload = {
  command: string;
  cwd?: string;
  shell?: string;
};

export type CommandOutputPayload = {
  chunk: string;
  stream: 'stdout' | 'stderr';
  exitCode?: number;
};

export type SearchKind = 'grep' | 'glob' | 'web';

export type SearchPayload = {
  query: string;
  kind: SearchKind;
  matches?: number;
};

export type WebFetchPayload = {
  url: string;
  status?: number;
  bytes?: number;
};

export type GitActionKind =
  | 'status'
  | 'stage'
  | 'unstage'
  | 'commit'
  | 'amend'
  | 'branch'
  | 'checkout'
  | 'merge'
  | 'push'
  | 'pull'
  | (string & {});

export type GitActionPayload = {
  action: GitActionKind;
  ref?: string;
  message?: string;
};

export type SubagentSpawnedPayload = {
  childAgentId: string;
  /** The delegated task, used as the worker Pixie station label. */
  task: string;
  provider?: string;
};

export type SubagentFinishedPayload = {
  childAgentId: string;
  status: 'success' | 'error' | 'cancelled';
  summary?: string;
};

export type TodoStatus = 'pending' | 'in_progress' | 'completed';

export type TodoItem = {
  id: string;
  text: string;
  status: TodoStatus;
};

export type TodoUpdatePayload = {
  todos: TodoItem[];
};

export type PermissionRisk = 'low' | 'medium' | 'high';

export type PermissionRequestPayload = {
  requestId: string;
  /** Short action name, for example `run command` or `edit file`. */
  action: string;
  /** The concrete detail, for example the exact command or path. */
  detail: string;
  risk?: PermissionRisk;
};

export type TokenUsagePayload = {
  inputTokens: number;
  outputTokens: number;
  totalTokens?: number;
  costUsd?: number;
  /** Tokens of context currently used. */
  contextUsed?: number;
  /** The model context window size. */
  contextWindow?: number;
};

export type ErrorPayload = {
  message: string;
  recoverable?: boolean;
  stack?: string;
};

export type CompletePayload = {
  summary?: string;
};

/**
 * The mapping from event type to its payload shape. Consumers can use this to
 * narrow an AgentEvent payload with confidence.
 */
export interface AgentEventPayloadMap {
  session_start: SessionLifecyclePayload;
  session_end: SessionLifecyclePayload;
  thinking: ThinkingPayload;
  message: MessagePayload;
  tool_call: ToolCallPayload;
  tool_result: ToolResultPayload;
  file_read: FilePayload;
  file_edit: FileEditPayload;
  file_create: FilePayload;
  file_delete: FilePayload;
  command_run: CommandRunPayload;
  command_output: CommandOutputPayload;
  search: SearchPayload;
  web_fetch: WebFetchPayload;
  git_action: GitActionPayload;
  subagent_spawned: SubagentSpawnedPayload;
  subagent_finished: SubagentFinishedPayload;
  todo_update: TodoUpdatePayload;
  permission_request: PermissionRequestPayload;
  token_usage: TokenUsagePayload;
  error: ErrorPayload;
  complete: CompletePayload;
}

/** The payload type for a given event type, or an empty record if untyped. */
export type PayloadFor<T extends AgentEventType> = T extends keyof AgentEventPayloadMap
  ? AgentEventPayloadMap[T]
  : Record<string, unknown>;
