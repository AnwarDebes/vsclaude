import type { AgentNode, AgentTree } from '@vsclaude/contracts';
import { TERMINAL_STATUSES } from './reduce.js';

/**
 * Returns the root {@link AgentNode} of a tree, or `undefined` when the tree is
 * empty or its declared root id is missing from the node map.
 */
export function getRootNode(tree: AgentTree): AgentNode | undefined {
  if (tree.rootAgentId === '') {
    return undefined;
  }
  return tree.nodes[tree.rootAgentId];
}

/**
 * Resolves the direct children of a node, skipping any dangling child ids that
 * are not present in the node map.
 */
export function childrenOf(tree: AgentTree, node: AgentNode): AgentNode[] {
  const result: AgentNode[] = [];
  for (const childId of node.children) {
    const child = tree.nodes[childId];
    if (child) {
      result.push(child);
    }
  }
  return result;
}

/**
 * Depth-first pre-order traversal starting from the root. The visitor receives
 * each node together with its depth (root is depth 0). A cycle guard ensures
 * the walk terminates even on a malformed tree.
 */
export function walkTree(
  tree: AgentTree,
  visit: (node: AgentNode, depth: number) => void,
): void {
  const root = getRootNode(tree);
  if (!root) {
    return;
  }
  const seen = new Set<string>();
  const stack: Array<{ node: AgentNode; depth: number }> = [{ node: root, depth: 0 }];
  while (stack.length > 0) {
    const frame = stack.pop();
    if (!frame) {
      break;
    }
    if (seen.has(frame.node.agentId)) {
      continue;
    }
    seen.add(frame.node.agentId);
    visit(frame.node, frame.depth);
    const kids = childrenOf(tree, frame.node);
    // Push in reverse so children are visited left-to-right.
    for (let i = kids.length - 1; i >= 0; i -= 1) {
      const kid = kids[i];
      if (kid) {
        stack.push({ node: kid, depth: frame.depth + 1 });
      }
    }
  }
}

/** Counts agents in the tree that are still running (not in a terminal state). */
export function countActiveAgents(tree: AgentTree): number {
  let active = 0;
  for (const node of Object.values(tree.nodes)) {
    if (!TERMINAL_STATUSES.has(node.status)) {
      active += 1;
    }
  }
  return active;
}

/** Sums input and output token totals across every node in the tree. */
export function totalTokenUsage(tree: AgentTree): { input: number; output: number } {
  let input = 0;
  let output = 0;
  for (const node of Object.values(tree.nodes)) {
    input += node.tokens?.input ?? 0;
    output += node.tokens?.output ?? 0;
  }
  return { input, output };
}

/**
 * Returns true when every node in the tree has reached a terminal state, which
 * is the signal the whole session has wound down.
 */
export function isSessionComplete(tree: AgentTree): boolean {
  const values = Object.values(tree.nodes);
  if (values.length === 0) {
    return false;
  }
  return values.every((node) => TERMINAL_STATUSES.has(node.status));
}
