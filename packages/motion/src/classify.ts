/**
 * Action classification: resolve a normalized AgentEvent to the most specific
 * action id in the catalog.
 *
 * The catalog in `@vsclaude/contracts` defines 200 fine-grained actions. Many
 * share one event type (every git operation is a `git_action`), so this module
 * inspects the tool name, the git action kind, and command keywords to pick the
 * best match. It always returns a valid action id, falling back to a sensible
 * default per event type.
 */
import type { AgentEvent } from '@vsclaude/contracts';
import { isActionId } from '@vsclaude/contracts';

/** Default action per event type when nothing more specific is known. */
const EVENT_DEFAULT_ACTION: Record<string, string> = {
  session_start: 'greet',
  session_end: 'rest',
  thinking: 'think',
  message: 'message',
  tool_call: 'tool',
  tool_result: 'tool',
  file_read: 'read',
  file_edit: 'edit',
  file_create: 'create',
  file_delete: 'delete',
  command_run: 'run',
  command_output: 'output',
  search: 'search',
  web_fetch: 'web',
  git_action: 'git',
  subagent_spawned: 'spawn',
  subagent_finished: 'handoff',
  todo_update: 'plan',
  permission_request: 'wait',
  token_usage: 'cost',
  error: 'stuck',
  complete: 'done',
};

/** Map a Claude tool name to an action id. */
const TOOL_ACTION: Record<string, string> = {
  Read: 'read',
  Edit: 'edit',
  MultiEdit: 'edit',
  NotebookEdit: 'edit',
  Write: 'create',
  Bash: 'run',
  BashOutput: 'output',
  Grep: 'search',
  Glob: 'search',
  WebFetch: 'web',
  WebSearch: 'web',
  Task: 'spawn',
  TodoWrite: 'plan',
};

/** Map a git action kind (from the git_action payload) to an action id. */
const GIT_ACTION: Record<string, string> = {
  commit: 'commit',
  amend: 'amend',
  branch: 'branch',
  checkout: 'branch',
  merge: 'merge',
  push: 'push',
  pull: 'pull',
  fetch: 'pull',
  stage: 'stage',
  unstage: 'stage',
  status: 'status',
  stash: 'stash',
  rebase: 'rebase',
  reset: 'reset',
  tag: 'tag',
  clone: 'clone',
};

/** Command keyword rules, first match wins, for `command_run` events. */
const COMMAND_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\btest\b|vitest|jest|pytest|\bspec\b/i, 'test'],
  [/\bbuild\b|tsc\b|compile/i, 'build'],
  [/\binstall\b|pnpm add|yarn add|npm i\b/i, 'install'],
  [/\blint\b|eslint/i, 'lint'],
  [/format|prettier/i, 'format'],
  [/coverage|--cov/i, 'coverage'],
  [/\bserve\b|\bdev\b|\bstart\b/i, 'serve'],
  [/deploy/i, 'deploy'],
  [/migrat/i, 'migrate'],
  [/docker|container/i, 'docker'],
  [/bench/i, 'benchmark'],
  [/\bgit\b/i, 'git'],
];

function readString(value: unknown, key: string): string | undefined {
  if (typeof value === 'object' && value !== null) {
    const v = (value as Record<string, unknown>)[key];
    return typeof v === 'string' ? v : undefined;
  }
  return undefined;
}

/**
 * Resolve an event to its specific action id. Always returns a valid id.
 */
export function classifyAction(event: AgentEvent): string {
  if (event.type === 'git_action') {
    const kind = readString(event.payload, 'action');
    const mapped = kind ? GIT_ACTION[kind] : undefined;
    return mapped ?? 'git';
  }

  if (event.type === 'command_run') {
    const command = readString(event.payload, 'command') ?? '';
    for (const [pattern, id] of COMMAND_RULES) {
      if (pattern.test(command)) {
        return id;
      }
    }
    return 'run';
  }

  const toolName = event.tool?.name;
  if (toolName) {
    const byTool = TOOL_ACTION[toolName];
    if (byTool) {
      return byTool;
    }
  }

  const fallback = EVENT_DEFAULT_ACTION[event.type];
  return fallback && isActionId(fallback) ? fallback : 'tool';
}
