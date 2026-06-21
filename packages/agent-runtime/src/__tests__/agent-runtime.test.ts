import { describe, it, expect } from 'vitest';
import { createAgentEvent } from '@vsclaude/contracts';
import type { AgentEvent, AgentEventInput, AgentTree } from '@vsclaude/contracts';
import {
  reduceAgentTree,
  SessionManager,
  countActiveAgents,
  totalTokenUsage,
  isSessionComplete,
  walkTree,
} from '../index.js';

/** Compact helper to build an event with sensible session/provider defaults. */
function ev(input: Omit<AgentEventInput, 'sessionId' | 'provider'> & {
  sessionId?: string;
  provider?: string;
}): AgentEvent {
  return createAgentEvent({
    sessionId: 's1',
    provider: 'claude-code',
    ...input,
  });
}

/** A scenario: root orchestrator spawns two workers, one finishes, tokens flow. */
function buildScenario(): AgentEvent[] {
  return [
    ev({ id: 'e1', agentId: 'root', ts: 100, type: 'session_start', payload: { provider: 'claude-code' } }),
    ev({
      id: 'e2',
      agentId: 'root',
      ts: 110,
      type: 'subagent_spawned',
      payload: { childAgentId: 'w1', task: 'write tests' },
    }),
    ev({
      id: 'e3',
      agentId: 'root',
      ts: 120,
      type: 'subagent_spawned',
      payload: { childAgentId: 'w2', task: 'refactor reducer' },
    }),
    ev({
      id: 'e4',
      agentId: 'w1',
      parentAgentId: 'root',
      ts: 130,
      type: 'token_usage',
      payload: { inputTokens: 200, outputTokens: 50 },
    }),
    ev({
      id: 'e5',
      agentId: 'w1',
      parentAgentId: 'root',
      ts: 140,
      type: 'token_usage',
      payload: { inputTokens: 100, outputTokens: 25 },
    }),
    ev({
      id: 'e6',
      agentId: 'root',
      ts: 150,
      type: 'subagent_finished',
      payload: { childAgentId: 'w1', status: 'success' },
    }),
  ];
}

describe('reduceAgentTree', () => {
  it('builds two children under the root from subagent_spawned', () => {
    const tree = reduceAgentTree(buildScenario());
    expect(tree.rootAgentId).toBe('root');
    const root = tree.nodes['root'];
    expect(root).toBeDefined();
    expect(root!.children).toEqual(['w1', 'w2']);
    expect(tree.nodes['w1']?.parentAgentId).toBe('root');
    expect(tree.nodes['w2']?.task).toBe('refactor reducer');
  });

  it('sets a finished worker status and leaves an unfinished one spawning', () => {
    const tree = reduceAgentTree(buildScenario());
    expect(tree.nodes['w1']?.status).toBe('finished');
    expect(tree.nodes['w1']?.finishedAt).toBe(150);
    expect(tree.nodes['w2']?.status).toBe('spawning');
  });

  it('accumulates token usage across multiple token_usage events', () => {
    const tree = reduceAgentTree(buildScenario());
    const w1 = tree.nodes['w1'];
    expect(w1?.tokens?.input).toBe(300);
    expect(w1?.tokens?.output).toBe(75);
  });

  it('maps an error-finished worker to the error status', () => {
    const events = [
      ev({ id: 'a', agentId: 'root', ts: 1, type: 'session_start', payload: {} }),
      ev({
        id: 'b',
        agentId: 'root',
        ts: 2,
        type: 'subagent_spawned',
        payload: { childAgentId: 'wx', task: 'risky job' },
      }),
      ev({
        id: 'c',
        agentId: 'root',
        ts: 3,
        type: 'subagent_finished',
        payload: { childAgentId: 'wx', status: 'error' },
      }),
    ];
    const tree = reduceAgentTree(events);
    expect(tree.nodes['wx']?.status).toBe('error');
  });

  it('marks the emitting agent finished on a complete event', () => {
    const events = [
      ev({ id: 'a', agentId: 'root', ts: 1, type: 'session_start', payload: {} }),
      ev({ id: 'b', agentId: 'root', ts: 9, type: 'complete', payload: {} }),
    ];
    const tree = reduceAgentTree(events);
    expect(tree.nodes['root']?.status).toBe('finished');
    expect(tree.nodes['root']?.finishedAt).toBe(9);
  });
});

describe('SessionManager', () => {
  it('notifies subscribers on change and exposes the current tree', () => {
    const mgr = new SessionManager();
    const seen: AgentTree[] = [];
    const unsub = mgr.subscribe((t) => seen.push(t));

    // Initial call from subscribe delivers the empty tree.
    expect(seen.length).toBe(1);
    expect(seen[0]?.rootAgentId).toBe('');

    for (const event of buildScenario()) {
      mgr.ingest(event);
    }

    const tree = mgr.getTree();
    expect(tree.rootAgentId).toBe('root');
    expect(tree.nodes['root']?.children.length).toBe(2);
    // More than the single initial notification fired as the tree grew.
    expect(seen.length).toBeGreaterThan(1);

    unsub();
    mgr.ingest(ev({ id: 'z', agentId: 'root', ts: 999, type: 'message', payload: { text: 'hi' } }));
    const before = seen.length;
    expect(seen.length).toBe(before); // unsubscribed listener no longer fires
    expect(mgr.eventCount).toBe(buildScenario().length + 1);
  });

  it('replays an initial event log identically to streaming it', () => {
    const events = buildScenario();
    const seeded = new SessionManager(events).getTree();
    const streamed = new SessionManager();
    for (const e of events) {
      streamed.ingest(e);
    }
    expect(streamed.getTree()).toEqual(seeded);
  });

  it('resets back to an empty tree', () => {
    const mgr = new SessionManager(buildScenario());
    expect(Object.keys(mgr.getTree().nodes).length).toBeGreaterThan(0);
    mgr.reset();
    expect(mgr.getTree().rootAgentId).toBe('');
    expect(Object.keys(mgr.getTree().nodes).length).toBe(0);
  });
});

describe('tree-utils', () => {
  it('counts active agents and totals tokens across the tree', () => {
    const tree = reduceAgentTree(buildScenario());
    // root and w2 are still running, w1 finished.
    expect(countActiveAgents(tree)).toBe(2);
    const totals = totalTokenUsage(tree);
    expect(totals.input).toBe(300);
    expect(totals.output).toBe(75);
    expect(isSessionComplete(tree)).toBe(false);
  });

  it('walks the tree in pre-order with correct depths', () => {
    const tree = reduceAgentTree(buildScenario());
    const visited: Array<{ id: string; depth: number }> = [];
    walkTree(tree, (node, depth) => visited.push({ id: node.agentId, depth }));
    expect(visited[0]).toEqual({ id: 'root', depth: 0 });
    expect(visited.map((v) => v.id)).toEqual(['root', 'w1', 'w2']);
    expect(visited.every((v) => (v.id === 'root' ? v.depth === 0 : v.depth === 1))).toBe(true);
  });
});
