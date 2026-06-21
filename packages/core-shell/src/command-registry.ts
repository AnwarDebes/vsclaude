/**
 * Command palette registry for the vsclaude core shell.
 *
 * Commands are registered by a unique id and surfaced through a subsequence
 * based fuzzy finder. The finder scores how well a query matches each command's
 * searchable text (title plus keywords) and returns matches in descending score
 * order, so the most relevant command floats to the top of the palette.
 */

/** A user invokable command. */
export interface Command {
  /** Stable unique identifier. */
  readonly id: string;
  /** Human readable label shown in the palette. */
  readonly title: string;
  /** The action to run when the command is chosen. */
  readonly run: () => void | Promise<void>;
  /** Extra terms that should also match this command. */
  readonly keywords?: readonly string[];
}

/** A command paired with its fuzzy match score against a query. */
export interface CommandMatch {
  readonly command: Command;
  /** Higher is better. Always greater than zero for returned matches. */
  readonly score: number;
}

/**
 * Score a single candidate string against a query using a subsequence match.
 *
 * Returns null when the query is not a subsequence of the candidate. Otherwise
 * returns a positive score that rewards: consecutive matched characters, a match
 * at the very start of the candidate, and matches that land at word boundaries.
 * The scoring is deliberately simple and dependency free.
 */
export function subsequenceScore(query: string, candidate: string): number | null {
  if (query.length === 0) {
    return 1;
  }
  const q = query.toLowerCase();
  const c = candidate.toLowerCase();

  let score = 0;
  let candidateIndex = 0;
  let previousMatchIndex = -2;

  for (let queryIndex = 0; queryIndex < q.length; queryIndex += 1) {
    const target = q.charAt(queryIndex);
    let found = -1;
    for (let scan = candidateIndex; scan < c.length; scan += 1) {
      if (c.charAt(scan) === target) {
        found = scan;
        break;
      }
    }
    if (found === -1) {
      return null;
    }

    // Base reward for any match.
    score += 1;
    // Reward consecutive characters.
    if (found === previousMatchIndex + 1) {
      score += 5;
    }
    // Reward matching the first character of the candidate.
    if (found === 0) {
      score += 8;
    }
    // Reward matches at a word boundary (after space, dash, dot, or slash).
    const prevChar = found > 0 ? c.charAt(found - 1) : '';
    if (prevChar === ' ' || prevChar === '-' || prevChar === '.' || prevChar === '/') {
      score += 4;
    }

    previousMatchIndex = found;
    candidateIndex = found + 1;
  }

  // Slightly prefer shorter candidates so exact short titles win ties.
  score += Math.max(0, 10 - candidate.length / 4);
  return score;
}

/**
 * Score a command against a query by taking the best score across its title and
 * each keyword. Title matches are weighted above keyword matches so a query that
 * hits the visible label outranks one that only hits a hidden synonym.
 */
export function scoreCommand(query: string, command: Command): number | null {
  let best: number | null = null;

  const consider = (raw: number | null, weight: number): void => {
    if (raw === null) {
      return;
    }
    const weighted = raw * weight;
    if (best === null || weighted > best) {
      best = weighted;
    }
  };

  consider(subsequenceScore(query, command.title), 1);
  if (command.keywords) {
    for (const keyword of command.keywords) {
      consider(subsequenceScore(query, keyword), 0.85);
    }
  }
  return best;
}

/**
 * In memory registry of commands with fuzzy lookup.
 *
 * The registry is the single source of truth for what the command palette can
 * run. Registration is idempotent per id: registering an id that already exists
 * throws, so callers must unregister first to replace a command.
 */
export class CommandRegistry {
  private readonly commands = new Map<string, Command>();

  /** Register a command. Throws when its id is already taken. */
  register(command: Command): void {
    if (command.id.length === 0) {
      throw new Error('CommandRegistry.register: command id must not be empty');
    }
    if (this.commands.has(command.id)) {
      throw new Error(`CommandRegistry.register: duplicate command id "${command.id}"`);
    }
    this.commands.set(command.id, command);
  }

  /**
   * Remove a command by id. Returns true when a command was removed, false when
   * no command with that id was present.
   */
  unregister(commandId: string): boolean {
    return this.commands.delete(commandId);
  }

  /** Return true when a command with the given id is registered. */
  has(commandId: string): boolean {
    return this.commands.has(commandId);
  }

  /** Look up a single command by id, or undefined when absent. */
  get(commandId: string): Command | undefined {
    return this.commands.get(commandId);
  }

  /** Number of registered commands. */
  get size(): number {
    return this.commands.size;
  }

  /**
   * List all registered commands, sorted alphabetically by title for a stable,
   * predictable order in the idle palette view.
   */
  list(): Command[] {
    return Array.from(this.commands.values()).sort((a, b) =>
      a.title.localeCompare(b.title),
    );
  }

  /**
   * Find commands matching a query, ranked best first.
   *
   * An empty or whitespace only query returns every command in the stable list
   * order. Otherwise only commands whose title or keywords match the query as a
   * subsequence are returned, sorted by descending score with title as a stable
   * tie breaker.
   */
  fuzzyFind(query: string): CommandMatch[] {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      return this.list().map((command) => ({ command, score: 0 }));
    }

    const matches: CommandMatch[] = [];
    for (const command of this.commands.values()) {
      const score = scoreCommand(trimmed, command);
      if (score !== null) {
        matches.push({ command, score });
      }
    }

    matches.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.command.title.localeCompare(b.command.title);
    });
    return matches;
  }

  /** Run a command by id. Throws when no such command exists. */
  async run(commandId: string): Promise<void> {
    const command = this.commands.get(commandId);
    if (command === undefined) {
      throw new Error(`CommandRegistry.run: unknown command "${commandId}"`);
    }
    await command.run();
  }

  /** Remove every command. */
  clear(): void {
    this.commands.clear();
  }
}
