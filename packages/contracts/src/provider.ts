/**
 * The provider adapter contract.
 *
 * Every model backend (Claude Code, Codex, Gemini, Ollama, and community
 * providers) implements this interface. The adapter is the only place that
 * knows a provider's native protocol; it translates that protocol into a
 * stream of {@link AgentEvent}. Adding a provider is therefore a small,
 * well-scoped job: implement ProviderAdapter, emit AgentEvents, done.
 */
import type { AgentEvent, ProviderId } from './agent-event.js';

/** What a provider can do. The UI uses this to enable or hide features. */
export interface ProviderCapabilities {
  /** Streams partial output token by token. */
  streaming: boolean;
  /** Emits tool_call and tool_result events. */
  toolCalls: boolean;
  /** Can delegate to sub-agents (drives the swarm view). */
  subagents: boolean;
  /** Surfaces permission_request events the user must approve. */
  permissions: boolean;
  /** Accepts image or other non-text input. */
  vision: boolean;
  /** The model ids this provider can run. */
  models: string[];
}

/** Options for starting a provider session. */
export interface ProviderSessionOptions {
  /** Working directory the agent operates in. */
  cwd: string;
  /** Model id to run. Defaults to the provider's recommended model. */
  model?: string;
  /** Optional system prompt or persona. */
  systemPrompt?: string;
  /** Extra environment variables for the agent process. */
  env?: Record<string, string>;
  /** Permission posture the session should start in. */
  permissionMode?: 'ask' | 'allow-listed' | 'plan';
}

/** A function that unsubscribes a previously registered listener. */
export type Unsubscribe = () => void;

/** A live handle to a running provider session. */
export interface ProviderSessionHandle {
  readonly sessionId: string;
  readonly provider: ProviderId;
  /** Send a user message or instruction to the agent. */
  send(input: string): Promise<void>;
  /** Answer a pending permission_request. */
  respondToPermission(
    requestId: string,
    decision: 'allow' | 'deny',
    remember?: boolean,
  ): Promise<void>;
  /** Subscribe to the normalized event stream. Returns an unsubscribe function. */
  onEvent(listener: (event: AgentEvent) => void): Unsubscribe;
  /** Stop the session and release the underlying process. */
  stop(): Promise<void>;
}

/** A provider adapter: a factory for sessions plus static metadata. */
export interface ProviderAdapter {
  /** Stable id, for example `claude-code`. */
  readonly id: ProviderId;
  /** Human-facing name, for example `Claude Code`. */
  readonly displayName: string;
  /** Describe what this provider supports. */
  capabilities(): ProviderCapabilities;
  /** Verify the provider is installed and configured. */
  isAvailable(): Promise<boolean>;
  /** Start a new session. */
  start(options: ProviderSessionOptions): Promise<ProviderSessionHandle>;
}
