/**
 * Detects runnable tasks from a project's package.json. For now this is npm
 * scripts: each `scripts` entry becomes a task that runs `npm run <name>`. Pure
 * and defensive (bad JSON or a missing scripts block yields no tasks), so the
 * parsing is unit tested.
 */
export interface NpmTask {
  id: string;
  label: string;
  command: string;
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
    .map((name) => ({ id: name, label: name, command: `npm run ${name}` }));
}
