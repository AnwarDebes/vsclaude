import type { AgentNode, AgentTree, AgentStatus } from '@vsclaude/contracts';

/**
 * A flattened, presentation-ready descriptor for a single worker (agent node)
 * in the swarm. The orchestration view renders one card or pixel sprite per
 * roster entry, so this carries only what the view needs: identity, the task
 * label, lifecycle status, tree depth (root is 0), and the parent agent id.
 */
export interface WorkerDescriptor {
  /** Stable identifier of this agent node. */
  readonly agentId: string;
  /** Human-readable task or role label for the worker. */
  readonly task: string;
  /** Current lifecycle status of the agent. */
  readonly status: AgentStatus;
  /** Depth in the tree, with the root agent at depth 0. */
  readonly depth: number;
  /** The agent id of the parent node, or null for the root. */
  readonly parent: string | null;
}

/** A display label for a node: its task when present, else the agent id. */
function labelFor(node: AgentNode): string {
  if (node.task && node.task.trim().length > 0) {
    return node.task;
  }
  return node.agentId;
}

/**
 * Walk the agent tree from its root and produce a flat roster. The contract
 * models the tree as a flat `nodes` map keyed by agent id, with each node
 * holding its child ids in `children`. Traversal is a stable pre-order walk so
 * a parent always appears before its descendants and the result is
 * deterministic for snapshot tests.
 *
 * @param tree The agent tree to flatten. A null or rootless tree yields [].
 */
export function computeRoster(tree: AgentTree | null | undefined): WorkerDescriptor[] {
  if (!tree || tree.nodes[tree.rootAgentId] === undefined) {
    return [];
  }

  const roster: WorkerDescriptor[] = [];
  const seen = new Set<string>();

  const visit = (agentId: string, depth: number, parent: string | null): void => {
    const node = tree.nodes[agentId];
    if (node === undefined || seen.has(agentId)) {
      return;
    }
    seen.add(agentId);

    roster.push({
      agentId: node.agentId,
      task: labelFor(node),
      status: node.status,
      depth,
      parent,
    });

    for (const childId of node.children) {
      visit(childId, depth + 1, node.agentId);
    }
  };

  visit(tree.rootAgentId, 0, null);
  return roster;
}

/**
 * The maximum depth present in a roster, or -1 when the roster is empty.
 */
export function rosterDepth(roster: readonly WorkerDescriptor[]): number {
  let max = -1;
  for (const entry of roster) {
    if (entry.depth > max) {
      max = entry.depth;
    }
  }
  return max;
}
