import type {
  AgentEvent,
  ToolCallPayload,
  ToolResultPayload,
  CommandRunPayload,
  CommandOutputPayload,
  TodoUpdatePayload,
} from '@vsclaude/contracts';
import type {
  TimelineItem,
  ToolCallTimelineItem,
  CommandTimelineItem,
} from './types.js';
import { payloadOf, readString, readOptionalString } from './payloads.js';

/**
 * Orders events by timestamp, then by sequence number as a deterministic
 * tie-breaker. Returns a new array; the input is not mutated.
 */
function sortEvents(events: readonly AgentEvent[]): AgentEvent[] {
  return [...events].sort((a, b) => {
    if (a.ts !== b.ts) {
      return a.ts - b.ts;
    }
    // AgentEvent has no sequence field; the id is the deterministic tie-break.
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * Derives the status of a tool call from its result payload. A missing result
 * is 'pending'; a result whose `isError` flag is truthy is 'error'; anything
 * else is 'ok'.
 */
function toolStatus(
  result: ToolResultPayload | undefined,
): ToolCallTimelineItem['status'] {
  if (result === undefined) {
    return 'pending';
  }
  const isError = (result as { isError?: unknown }).isError;
  return isError === true ? 'error' : 'ok';
}

/**
 * Builds an ordered timeline of inspectable items from a raw AgentEvent stream.
 *
 * The core transformations are:
 * - tool_call events are matched to their tool_result by `toolUseId` and
 *   collapsed into a single {@link ToolCallTimelineItem}.
 * - command_run events are matched to their command_output by `runId` (or
 *   `toolUseId`) and collapsed into a single {@link CommandTimelineItem}.
 * - todo_update events become standalone `plan` items.
 * - message, thinking, file, and file_edit events map one-to-one.
 *
 * Events are processed in (ts, seq) order so that a result that arrives after
 * its call is correctly attached, and the resulting array preserves that order
 * with each collapsed pair anchored at the position of its originating event.
 */
export function buildTimeline(events: readonly AgentEvent[]): TimelineItem[] {
  const ordered = sortEvents(events);

  // First pass: index results so a call can find its result regardless of the
  // arrival order within the (already sorted) stream.
  const resultByToolUseId = new Map<
    string,
    { payload: ToolResultPayload; event: AgentEvent }
  >();
  const outputByRunId = new Map<
    string,
    { payload: CommandOutputPayload; event: AgentEvent }
  >();

  for (const event of ordered) {
    const result = payloadOf(event, 'tool_result');
    if (result !== undefined) {
      const id = readOptionalString(result, 'toolUseId');
      if (id !== undefined) {
        resultByToolUseId.set(id, { payload: result, event });
      }
      continue;
    }
    const output = payloadOf(event, 'command_output');
    if (output !== undefined) {
      const id =
        readOptionalString(output, 'runId') ??
        readOptionalString(output, 'toolUseId');
      if (id !== undefined) {
        outputByRunId.set(id, { payload: output, event });
      }
    }
  }

  const items: TimelineItem[] = [];
  // Track which secondary events were consumed so they are not emitted twice.
  const consumed = new Set<string>();

  for (let i = 0; i < ordered.length; i += 1) {
    const event = ordered[i];
    if (event === undefined || consumed.has(event.id)) {
      continue;
    }

    // AgentEvent carries no sequence number, so the ordered index serves as the
    // deterministic tie-break sequence for downstream consumers.
    const base = {
      id: event.id,
      ts: event.ts,
      seq: i,
      provider: event.provider,
      sessionId: event.sessionId,
    } as const;

    const message = payloadOf(event, 'message');
    if (message !== undefined) {
      const role = readOptionalString(event.payload, 'role') === 'user' ? 'user' : 'assistant';
      items.push({
        ...base,
        kind: 'message',
        role,
        payload: message,
        event,
      });
      continue;
    }

    const thinking = payloadOf(event, 'thinking');
    if (thinking !== undefined) {
      items.push({ ...base, kind: 'thinking', payload: thinking, event });
      continue;
    }

    const todo = payloadOf(event, 'todo_update');
    if (todo !== undefined) {
      const update = todo as TodoUpdatePayload;
      items.push({
        ...base,
        kind: 'plan',
        todos: Array.isArray(update.todos) ? update.todos : [],
        event,
      });
      continue;
    }

    const file =
      payloadOf(event, 'file_read') ??
      payloadOf(event, 'file_create') ??
      payloadOf(event, 'file_delete');
    if (file !== undefined) {
      items.push({
        ...base,
        kind: 'fileChange',
        path: readString(file, 'path', ''),
        payload: file,
        event,
      });
      continue;
    }

    const fileEdit = payloadOf(event, 'file_edit');
    if (fileEdit !== undefined) {
      items.push({
        ...base,
        kind: 'fileChange',
        path: readString(fileEdit, 'path', ''),
        payload: fileEdit,
        event,
      });
      continue;
    }

    const call = payloadOf(event, 'tool_call');
    if (call !== undefined) {
      items.push(collapseToolCall(base, event, call, resultByToolUseId, consumed));
      continue;
    }

    const run = payloadOf(event, 'command_run');
    if (run !== undefined) {
      items.push(collapseCommand(base, event, run, outputByRunId, consumed));
      continue;
    }

    // tool_result / command_output handled inline above as secondary events.
    // Any standalone secondary event (a result with no matching call) is
    // dropped from the timeline intentionally: it carries no display anchor.
  }

  return items;
}

type ItemBase = Pick<
  TimelineItem,
  'id' | 'ts' | 'seq' | 'provider' | 'sessionId'
>;

/** Collapses a tool_call event with its matched tool_result, if present. */
function collapseToolCall(
  base: ItemBase,
  event: AgentEvent,
  call: ToolCallPayload,
  resultByToolUseId: Map<
    string,
    { payload: ToolResultPayload; event: AgentEvent }
  >,
  consumed: Set<string>,
): ToolCallTimelineItem {
  const toolUseId = readString(call, 'toolUseId', event.id);
  const toolName = readString(call, 'toolName', readString(call, 'name', ''));
  const matched = resultByToolUseId.get(toolUseId);
  if (matched !== undefined) {
    consumed.add(matched.event.id);
  }
  return {
    ...base,
    kind: 'toolCall',
    toolUseId,
    toolName,
    call,
    callEvent: event,
    result: matched?.payload,
    resultEvent: matched?.event,
    status: toolStatus(matched?.payload),
  };
}

/** Collapses a command_run event with its matched command_output, if present. */
function collapseCommand(
  base: ItemBase,
  event: AgentEvent,
  run: CommandRunPayload,
  outputByRunId: Map<
    string,
    { payload: CommandOutputPayload; event: AgentEvent }
  >,
  consumed: Set<string>,
): CommandTimelineItem {
  const runId =
    readOptionalString(run, 'runId') ??
    readOptionalString(run, 'toolUseId') ??
    event.id;
  const matched = outputByRunId.get(runId);
  if (matched !== undefined) {
    consumed.add(matched.event.id);
  }
  return {
    ...base,
    kind: 'command',
    command: readString(run, 'command', ''),
    run,
    runEvent: event,
    output: matched?.payload,
    outputEvent: matched?.event,
  };
}
