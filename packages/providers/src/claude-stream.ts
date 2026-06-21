import {
  createAgentEvent,
  type AgentEvent,
  type AgentEventType,
  type ProviderId,
  type PayloadFor,
  type ToolRef,
} from '@vsclaude/contracts';

import { makeEventId, type Counter } from './ids.js';

/**
 * Context required to turn a raw Claude Code stream line into an AgentEvent.
 *
 * The same context is reused for every line of a single session. The `counter`
 * keeps event ids stable and ordered without reaching for randomness.
 */
export interface ClaudeParseContext {
  /** The session id every emitted event belongs to. */
  readonly sessionId: string;
  /** The agent (tree node) id every emitted event belongs to. */
  readonly agentId: string;
  /** The provider id, normally 'claude-code'. */
  readonly provider: ProviderId;
  /** Monotonic counter used to allocate event ids. */
  readonly counter: Counter;
  /** Event timestamp in epoch milliseconds. Defaults to the current time. */
  readonly now?: () => number;
}

/**
 * Minimal shape of a Claude Code stream-json content block. Claude emits a
 * small set of block kinds inside `message.content`; we only model the fields
 * we actually consume and treat everything else as unknown.
 */
interface RawContentBlock {
  type?: unknown;
  text?: unknown;
  thinking?: unknown;
  id?: unknown;
  name?: unknown;
  input?: unknown;
  tool_use_id?: unknown;
  content?: unknown;
  is_error?: unknown;
}

/** Type guard: value is a non-null object (a record we can index by string). */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Reads a string field from a record, or returns undefined when absent. */
function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

/** Truncates a string for use inside a short human caption. */
function clip(text: string, max = 80): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 1)}...`;
}

/** Pulls the last path segment out of a file path for nicer captions. */
function baseName(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const segments = normalized.split('/').filter((segment) => segment.length > 0);
  const last = segments[segments.length - 1];
  return last ?? path;
}

/**
 * Maps a Claude tool name to the AgentEvent type it should become. Unknown
 * tools fall back to a generic 'tool_call'. Only event types that exist in the
 * frozen contract are produced.
 */
function classifyTool(toolName: string): AgentEventType {
  switch (toolName) {
    case 'Edit':
    case 'MultiEdit':
    case 'NotebookEdit':
      return 'file_edit';
    case 'Write':
      return 'file_create';
    case 'Read':
      return 'file_read';
    case 'Bash':
    case 'BashOutput':
      return 'command_run';
    case 'Grep':
    case 'Glob':
      return 'search';
    case 'WebFetch':
      return 'web_fetch';
    case 'Task':
      return 'subagent_spawned';
    case 'TodoWrite':
      return 'todo_update';
    default:
      return 'tool_call';
  }
}

/** Extra event fields that ride alongside the typed payload. */
interface EmitExtras {
  caption: string;
  raw: unknown;
  /** The tool reference, stored on `event.tool` for the inspector drill-down. */
  tool?: ToolRef;
  /** Set for delegated workers so the swarm view can build the tree. */
  parentAgentId?: string;
}

function nowFor(ctx: ClaudeParseContext): number {
  return ctx.now ? ctx.now() : Date.now();
}

/**
 * Builds an AgentEvent. The payload generic is tied to the event type so a type
 * cannot be paired with the wrong payload. The tool reference lives on
 * `event.tool` (not in the payload), matching the contract.
 */
function emit<T extends AgentEventType>(
  ctx: ClaudeParseContext,
  type: T,
  payload: PayloadFor<T>,
  extras: EmitExtras,
): AgentEvent {
  return createAgentEvent({
    id: makeEventId(ctx.sessionId, ctx.counter.next()),
    sessionId: ctx.sessionId,
    agentId: ctx.agentId,
    ts: nowFor(ctx),
    provider: ctx.provider,
    type,
    payload,
    caption: extras.caption,
    raw: extras.raw,
    ...(extras.tool ? { tool: extras.tool } : {}),
    ...(extras.parentAgentId ? { parentAgentId: extras.parentAgentId } : {}),
  });
}

/**
 * Translates a single tool_use content block into an AgentEvent. Tool inputs
 * are provider specific, so we narrow defensively and extract the handful of
 * fields that drive the UI. The full input is preserved in both `event.tool`
 * and `event.raw`.
 */
function parseToolUse(
  ctx: ClaudeParseContext,
  block: RawContentBlock,
  raw: unknown,
): AgentEvent | null {
  const toolName = typeof block.name === 'string' ? block.name : '';
  if (toolName.length === 0) {
    return null;
  }

  const input = isRecord(block.input) ? block.input : {};
  const toolUseId = typeof block.id === 'string' ? block.id : undefined;
  const type = classifyTool(toolName);
  const toolRef: ToolRef = { name: toolName, input, toolUseId };

  switch (type) {
    case 'file_edit': {
      const path = readString(input, 'file_path') ?? readString(input, 'path') ?? '';
      const payload: PayloadFor<'file_edit'> = { path };
      return emit(ctx, 'file_edit', payload, {
        caption: `Editing ${baseName(path) || 'file'}`,
        raw,
        tool: toolRef,
      });
    }
    case 'file_create': {
      const path = readString(input, 'file_path') ?? readString(input, 'path') ?? '';
      const payload: PayloadFor<'file_create'> = { path };
      return emit(ctx, 'file_create', payload, {
        caption: `Creating ${baseName(path) || 'file'}`,
        raw,
        tool: toolRef,
      });
    }
    case 'file_read': {
      const path = readString(input, 'file_path') ?? readString(input, 'path') ?? '';
      const payload: PayloadFor<'file_read'> = { path };
      return emit(ctx, 'file_read', payload, {
        caption: `Reading ${baseName(path) || 'file'}`,
        raw,
        tool: toolRef,
      });
    }
    case 'command_run': {
      const command = readString(input, 'command') ?? '';
      const payload: PayloadFor<'command_run'> = { command };
      return emit(ctx, 'command_run', payload, {
        caption: `Running: ${clip(command, 60)}`,
        raw,
        tool: toolRef,
      });
    }
    case 'search': {
      const query = readString(input, 'pattern') ?? readString(input, 'query') ?? '';
      const payload: PayloadFor<'search'> = {
        query,
        kind: toolName === 'Glob' ? 'glob' : 'grep',
      };
      return emit(ctx, 'search', payload, {
        caption: `Searching for "${clip(query, 50)}"`,
        raw,
        tool: toolRef,
      });
    }
    case 'web_fetch': {
      const url = readString(input, 'url') ?? '';
      const payload: PayloadFor<'web_fetch'> = { url };
      return emit(ctx, 'web_fetch', payload, {
        caption: `Fetching ${clip(url, 60)}`,
        raw,
        tool: toolRef,
      });
    }
    case 'subagent_spawned': {
      const task =
        readString(input, 'description') ?? readString(input, 'subagent_type') ?? 'subagent';
      const payload: PayloadFor<'subagent_spawned'> = {
        childAgentId: toolUseId ?? `task-${ctx.counter.peek()}`,
        task,
        provider: ctx.provider,
      };
      return emit(ctx, 'subagent_spawned', payload, {
        caption: `Spawning subagent: ${clip(task, 50)}`,
        raw,
        tool: toolRef,
        parentAgentId: ctx.agentId,
      });
    }
    case 'todo_update': {
      const payload: PayloadFor<'todo_update'> = { todos: [] };
      return emit(ctx, 'todo_update', payload, {
        caption: 'Updating the plan',
        raw,
        tool: toolRef,
      });
    }
    default: {
      const payload: PayloadFor<'tool_call'> = {
        name: toolName,
        input,
        toolUseId,
      };
      return emit(ctx, 'tool_call', payload, {
        caption: `Using tool ${toolName}`,
        raw,
        tool: toolRef,
      });
    }
  }
}

/** Extracts plain text from a tool_result content field (string or blocks). */
function readToolResultText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const entry of content) {
      if (isRecord(entry)) {
        const text = readString(entry, 'text');
        if (text !== undefined) {
          parts.push(text);
        }
      }
    }
    return parts.join('\n');
  }
  return '';
}

/**
 * Parses one NDJSON line of Claude Code stream-json output into an AgentEvent.
 *
 * Recognized line kinds:
 *  - assistant message with text blocks becomes 'message' (or 'thinking')
 *  - assistant message with tool_use blocks becomes a mapped tool event
 *  - user message with tool_result blocks becomes 'tool_result'
 *  - a top level result line becomes 'complete'
 *
 * One line in, one event out, so the parser is trivial to test.
 *
 * @param line A single line of stream-json. Surrounding whitespace is fine.
 * @param ctx The session context (ids, provider, counter).
 * @returns The parsed AgentEvent, or null for blank or unrecognized lines.
 */
export function parseClaudeStreamLine(line: string, ctx: ClaudeParseContext): AgentEvent | null {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return null;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(trimmed);
  } catch {
    return null;
  }

  if (!isRecord(raw)) {
    return null;
  }

  const kind = readString(raw, 'type');

  // Final result line: { type: 'result', subtype, result, ... }.
  if (kind === 'result') {
    const subtype = readString(raw, 'subtype') ?? 'success';
    const success = subtype === 'success' && raw['is_error'] !== true;
    const summary = readString(raw, 'result');
    const payload: PayloadFor<'complete'> = summary !== undefined ? { summary } : {};
    return emit(ctx, 'complete', payload, {
      caption: success ? 'Session complete' : 'Session ended with an error',
      raw,
    });
  }

  // Assistant or user message lines wrap an Anthropic message object.
  if (kind === 'assistant' || kind === 'user') {
    const message = isRecord(raw['message']) ? raw['message'] : raw;
    const content = message['content'];

    // Some lines carry content as a bare string (rare, but valid).
    if (typeof content === 'string' && content.trim().length > 0 && kind === 'assistant') {
      const payload: PayloadFor<'message'> = { text: content };
      return emit(ctx, 'message', payload, { caption: clip(content), raw });
    }

    if (!Array.isArray(content)) {
      return null;
    }

    for (const entry of content) {
      if (!isRecord(entry)) {
        continue;
      }
      const block = entry as RawContentBlock;
      const blockType = typeof block.type === 'string' ? block.type : '';

      if (blockType === 'thinking') {
        const text =
          typeof block.thinking === 'string'
            ? block.thinking
            : typeof block.text === 'string'
              ? block.text
              : '';
        const payload: PayloadFor<'thinking'> = { text };
        return emit(ctx, 'thinking', payload, { caption: clip(text) || 'Thinking', raw });
      }

      if (blockType === 'text' && kind === 'assistant') {
        const text = typeof block.text === 'string' ? block.text : '';
        if (text.trim().length === 0) {
          continue;
        }
        const payload: PayloadFor<'message'> = { text };
        return emit(ctx, 'message', payload, { caption: clip(text), raw });
      }

      if (blockType === 'tool_use' && kind === 'assistant') {
        const event = parseToolUse(ctx, block, raw);
        if (event !== null) {
          return event;
        }
      }

      if (blockType === 'tool_result' && kind === 'user') {
        const text = readToolResultText(block.content);
        const isError = block.is_error === true;
        const toolUseId = readString(block as Record<string, unknown>, 'tool_use_id');
        const payload: PayloadFor<'tool_result'> = {
          toolUseId,
          output: text,
          isError,
        };
        return emit(ctx, 'tool_result', payload, {
          caption: isError ? 'Tool returned an error' : 'Tool result received',
          raw,
          tool: { name: 'tool', input: undefined, toolUseId },
        });
      }
    }
    return null;
  }

  return null;
}
