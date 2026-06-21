/**
 * A lightweight, local event-to-motion helper used by the first-run demo.
 *
 * This is intentionally small. The full, debounced, prioritized mapper lives in
 * the `@vsclaude/motion` package and will replace this once that package is
 * wired into the shell. Keeping a tiny local version here lets the desktop app
 * demonstrate the soul without coupling to an API that is still settling.
 */
import {
  EVENT_TO_STATE,
  type AgentEvent,
  type PixieState,
  type FilePayload,
  type SearchPayload,
  type CommandRunPayload,
  type SubagentSpawnedPayload,
  type GitActionPayload,
} from '@vsclaude/contracts';

/** The Pixie state an event implies, falling back to idle. */
export function pixieStateFor(event: AgentEvent): PixieState {
  return EVENT_TO_STATE[event.type] ?? 'idle';
}

function basename(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] ?? path;
}

/** A plain-language caption for an event. Prefers an explicit caption if present. */
export function captionFor(event: AgentEvent): string | undefined {
  if (event.caption) return event.caption;
  const p = event.payload ?? {};
  switch (event.type) {
    case 'session_start':
      return 'Hi! Ready when you are.';
    case 'thinking':
      return 'Working out a plan.';
    case 'todo_update':
      return 'Mapping the steps.';
    case 'file_read':
      return `Reading ${basename((p as FilePayload).path ?? 'a file')}.`;
    case 'file_edit':
    case 'file_create':
      return `Writing ${basename((p as FilePayload).path ?? 'a file')}.`;
    case 'search':
      return `Searching for '${(p as SearchPayload).query ?? ''}'.`;
    case 'web_fetch':
      return 'Checking the docs online.';
    case 'command_run':
      return `Running ${(p as CommandRunPayload).command ?? 'a command'}.`;
    case 'git_action':
      return (p as GitActionPayload).action === 'commit'
        ? 'Saving your work to git.'
        : 'Working with git.';
    case 'subagent_spawned':
      return `Calling in a helper for ${(p as SubagentSpawnedPayload).task ?? 'a task'}.`;
    case 'permission_request':
      return 'Need your OK to run this.';
    case 'complete':
      return 'Done. That went well.';
    case 'error':
      return 'Hmm, that did not work. Trying another way.';
    default:
      return undefined;
  }
}
