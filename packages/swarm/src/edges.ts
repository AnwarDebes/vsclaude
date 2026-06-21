import type { AgentTree } from '@vsclaude/contracts';

/**
 * A directed delegation thread from a parent agent to one of its children. The
 * orchestration view draws one animated thread per edge to show who spawned
 * whom.
 */
export interface DelegationEdge {
  /** The delegating (parent) agent id. */
  readonly from: string;
  /** The delegated (child) agent id. */
  readonly to: string;
}

/**
 * Derive the set of delegation edges for the whole tree. Every parent-to-child
 * link becomes one { from, to } edge. The walk is pre-order and cycle-safe, so
 * a well-formed tree of N nodes yields exactly N minus 1 edges.
 *
 * @param tree The agent tree. A null or rootless tree yields [].
 */
export function delegationEdges(tree: AgentTree | null | undefined): DelegationEdge[] {
  if (!tree || tree.nodes[tree.rootAgentId] === undefined) {
    return [];
  }

  const edges: DelegationEdge[] = [];
  const visited = new Set<string>();

  const visit = (agentId: string): void => {
    const node = tree.nodes[agentId];
    if (node === undefined || visited.has(agentId)) {
      return;
    }
    visited.add(agentId);

    for (const childId of node.children) {
      edges.push({ from: node.agentId, to: childId });
      visit(childId);
    }
  };

  visit(tree.rootAgentId);
  return edges;
}
