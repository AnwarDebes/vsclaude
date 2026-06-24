/**
 * Detects runnable tasks from a project's package.json. For now this is npm
 * scripts: each `scripts` entry becomes a task that runs `npm run <name>`. Pure
 * and defensive (bad JSON or a missing scripts block yields no tasks), so the
 * parsing is unit tested.
 */
export type TaskGroup = 'build' | 'test';

export interface NpmTask {
  id: string;
  label: string;
  command: string;
  /** The VS Code task group, when known. */
  group?: TaskGroup;
}

/** Classify a script or task name into a build or test group, if it looks like one. */
export function classifyTaskGroup(name: string): TaskGroup | undefined {
  const lower = name.toLowerCase();
  if (lower === 'test' || lower === 'tests' || lower.startsWith('test:')) return 'test';
  if (lower === 'build' || lower.startsWith('build:')) return 'build';
  return undefined;
}

/**
 * Parses a VS Code .vscode/tasks.json. Each task with a label and command becomes
 * a runnable task; string args are appended to the command. Defensive, so bad JSON
 * or a missing tasks array yields no tasks. Unit tested.
 */
export function parseTasksJson(tasksJsonText: string): NpmTask[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(tasksJsonText);
  } catch {
    return [];
  }
  if (typeof parsed !== 'object' || parsed === null) return [];
  const tasks = (parsed as { tasks?: unknown }).tasks;
  if (!Array.isArray(tasks)) return [];
  const out: NpmTask[] = [];
  for (const task of tasks) {
    if (typeof task !== 'object' || task === null) continue;
    const label = (task as { label?: unknown }).label;
    const command = (task as { command?: unknown }).command;
    if (typeof label !== 'string' || label.length === 0) continue;
    if (typeof command !== 'string' || command.length === 0) continue;
    const args = (task as { args?: unknown }).args;
    const argString = Array.isArray(args) ? args.filter((a) => typeof a === 'string').join(' ') : '';
    const rawGroup = (task as { group?: unknown }).group;
    const groupKind =
      typeof rawGroup === 'string'
        ? rawGroup
        : typeof rawGroup === 'object' && rawGroup !== null
          ? (rawGroup as { kind?: unknown }).kind
          : undefined;
    const group = groupKind === 'build' || groupKind === 'test' ? groupKind : undefined;
    out.push({
      id: `tasksjson-${label}`,
      label,
      command: argString ? `${command} ${argString}` : command,
      group,
    });
  }
  return out;
}

export function detectNpmTasks(packageJsonText: string): NpmTask[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(packageJsonText);
  } catch {
    return [];
  }
  if (typeof parsed !== 'object' || parsed === null) return [];
  const scripts = (parsed as { scripts?: unknown }).scripts;
  if (typeof scripts !== 'object' || scripts === null) return [];
  const entries = scripts as Record<string, unknown>;
  return Object.keys(entries)
    .filter((name) => typeof entries[name] === 'string' && name.length > 0)
    .map((name) => ({ id: name, label: name, command: `npm run ${name}`, group: classifyTaskGroup(name) }));
}
