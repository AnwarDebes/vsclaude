import type {
  AgentEvent,
  AgentEventType,
  PayloadFor,
} from '@vsclaude/contracts';

/**
 * Caption generation: human readable one liners describing what the agent is
 * doing right now. Captions are short, present tense, and friendly. They are
 * the "voice" of the Pixie character (sacred rule 3: every directive carries a
 * caption).
 */

/**
 * Extract the trailing path segment from a unix or windows style path.
 * Returns the input unchanged when there is no separator.
 */
export function basename(rawPath: string): string {
  const trimmed = rawPath.replace(/[\\/]+$/, '');
  if (trimmed.length === 0) {
    return rawPath;
  }
  const lastSlash = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
  if (lastSlash === -1) {
    return trimmed;
  }
  return trimmed.slice(lastSlash + 1);
}

/**
 * Truncate a string to a maximum length, appending an ellipsis when cut.
 * Used to keep captions readable when queries or messages are long.
 */
export function truncate(value: string, max = 48): string {
  if (value.length <= max) {
    return value;
  }
  if (max <= 1) {
    return value.slice(0, max);
  }
  return `${value.slice(0, max - 1)}...`;
}

/**
 * A typed payload reader that narrows the event payload to the shape for a
 * specific event type. Returns undefined when the event is of another type.
 */
function payloadOf<T extends AgentEventType>(
  event: AgentEvent,
  type: T,
): PayloadFor<T> | undefined {
  if (event.type === type) {
    return event.payload as PayloadFor<T>;
  }
  return undefined;
}

/**
 * Produce a caption for a single event. This is a pure function: the same
 * event always yields the same caption. Unknown event types fall back to a
 * neutral, non alarming message.
 */
export function captionFor(event: AgentEvent): string {
  switch (event.type) {
    case 'session_start':
      return 'Booting up. Let us begin.';
    case 'session_end':
      return 'Wrapping up the session.';
    case 'thinking': {
      const p = payloadOf(event, 'thinking');
      const text = p?.text?.trim();
      if (text && text.length > 0) {
        return `Thinking: ${truncate(text)}`;
      }
      return 'Thinking it through.';
    }
    case 'message': {
      const p = payloadOf(event, 'message');
      const text = p?.text?.trim();
      if (text && text.length > 0) {
        return truncate(text, 64);
      }
      return 'Writing a reply.';
    }
    case 'tool_call': {
      const p = payloadOf(event, 'tool_call');
      const name = p?.name?.trim();
      if (name && name.length > 0) {
        return `Using ${name}.`;
      }
      return 'Reaching for a tool.';
    }
    case 'tool_result': {
      const p = payloadOf(event, 'tool_result');
      if (p?.isError === true) {
        return 'That tool came back with an error.';
      }
      return 'Got a result back.';
    }
    case 'file_read': {
      const p = payloadOf(event, 'file_read');
      const file = p?.path ? basename(p.path) : undefined;
      return file ? `Reading ${file}.` : 'Reading a file.';
    }
    case 'file_edit': {
      const p = payloadOf(event, 'file_edit');
      const file = p?.path ? basename(p.path) : undefined;
      return file ? `Editing ${file}.` : 'Editing a file.';
    }
    case 'file_create': {
      const p = payloadOf(event, 'file_create');
      const file = p?.path ? basename(p.path) : undefined;
      return file ? `Writing ${file}.` : 'Writing a file.';
    }
    case 'file_delete': {
      const p = payloadOf(event, 'file_delete');
      const file = p?.path ? basename(p.path) : undefined;
      return file ? `Deleting ${file}.` : 'Deleting a file.';
    }
    case 'command_run': {
      const p = payloadOf(event, 'command_run');
      const cmd = p?.command?.trim();
      return cmd ? `Running: ${truncate(cmd)}` : 'Running a command.';
    }
    case 'command_output':
      return 'Watching the command output.';
    case 'search': {
      const p = payloadOf(event, 'search');
      const query = p?.query?.trim();
      return query ? `Searching for '${truncate(query)}'.` : 'Searching the code.';
    }
    case 'web_fetch': {
      const p = payloadOf(event, 'web_fetch');
      const url = p?.url?.trim();
      return url ? `Fetching ${truncate(url)}` : 'Fetching from the web.';
    }
    case 'git_action': {
      const p = payloadOf(event, 'git_action');
      const action = p?.action?.trim();
      return action ? `Git: ${action}.` : 'Working with git.';
    }
    case 'subagent_spawned':
      return 'Sending out a helper agent.';
    case 'subagent_finished':
      return 'A helper agent reported back.';
    case 'todo_update':
      return 'Updating the plan.';
    case 'permission_request':
      return 'Need your OK to run this.';
    case 'token_usage':
      return 'Counting tokens.';
    case 'error': {
      const p = payloadOf(event, 'error');
      const msg = p?.message?.trim();
      return msg ? `Hit a snag: ${truncate(msg)}` : 'Something went wrong.';
    }
    case 'complete':
      return 'All done.';
    default: {
      // Exhaustiveness guard: if a new event type is added to the union and
      // this switch is not updated, the assignment below becomes a type error.
      const _exhaustive: never = event.type;
      void _exhaustive;
      return 'Working on it.';
    }
  }
}
