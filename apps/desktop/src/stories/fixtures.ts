/**
 * Shared Storybook fixtures: real session-derived data computed once from the
 * demo session using the same packages the app uses, so the panel stories show
 * realistic state.
 */
import type { AgentEvent } from '@vsclaude/contracts';
import { reduceAgentTree } from '@vsclaude/agent-runtime';
import { buildTimeline } from '@vsclaude/chat';
import { aggregateTokens, computeRoster, delegationEdges } from '@vsclaude/swarm';
import { classifyAction } from '@vsclaude/motion';
import { demoSession } from '../session/demo-session';

export const tree = reduceAgentTree(demoSession);
export const roster = computeRoster(tree);
export const edges = delegationEdges(tree);
export const tokens = aggregateTokens(tree);
export const timeline = buildTimeline(demoSession);

export const actionByAgent: Record<string, string> = (() => {
  const latest: Record<string, AgentEvent> = {};
  for (const event of demoSession) latest[event.agentId] = event;
  const out: Record<string, string> = {};
  for (const [agentId, event] of Object.entries(latest)) out[agentId] = classifyAction(event);
  return out;
})();

export const narration = [
  'Reading the auth module.',
  'Delegating the login form.',
  'Running the tests.',
  'Done! All tests pass.',
];
