/**
 * Substitutes ${name} variables in a task command, the way VS Code does for
 * tasks.json. Known names (workspaceFolder, file, fileBasename) and ${env:NAME}
 * resolve from the provided map; an unknown ${name} is left as-is. Pure, so the
 * substitution is unit tested.
 */
export function substituteVariables(text: string, vars: Record<string, string>): string {
  return text.replace(/\$\{([^}]+)\}/g, (match, name: string) => {
    if (name.startsWith('env:')) {
      return vars[name] ?? '';
    }
    return vars[name] ?? match;
  });
}
