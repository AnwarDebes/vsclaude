import type { AgentTree } from '@vsclaude/contracts';

/**
 * Aggregate token and cost meters summed across every node in a swarm. The view
 * shows this as the platform-wide fuel gauge for a run.
 */
export interface TokenAggregate {
  /** Total input (prompt) tokens consumed across all agents. */
  readonly input: number;
  /** Total output (completion) tokens produced across all agents. */
  readonly output: number;
  /** Total estimated cost in US dollars across all agents. */
  readonly costUsd: number;
}

/** Coerce a possibly-missing numeric meter to a finite, non-negative number. */
function nonNegative(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Sum input tokens, output tokens, and dollar cost across every node in the
 * tree. Each node carries its own running totals in `node.tokens`, so a single
 * pass over the flat `nodes` map is exact and cannot double count.
 *
 * @param tree The agent tree. A null tree yields a zeroed aggregate.
 */
export function aggregateTokens(tree: AgentTree | null | undefined): TokenAggregate {
  if (!tree) {
    return { input: 0, output: 0, costUsd: 0 };
  }

  let input = 0;
  let output = 0;
  let costUsd = 0;

  for (const node of Object.values(tree.nodes)) {
    const tokens = node.tokens;
    if (tokens === undefined) {
      continue;
    }
    input += nonNegative(tokens.input);
    output += nonNegative(tokens.output);
    costUsd += nonNegative(tokens.costUsd);
  }

  return { input, output, costUsd };
}
