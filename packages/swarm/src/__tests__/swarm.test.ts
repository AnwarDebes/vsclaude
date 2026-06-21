import { describe, it, expect } from 'vitest';
import type { AgentTree } from '@vsclaude/contracts';
import {
  computeRoster,
  rosterDepth,
  delegationEdges,
  aggregateTokens,
  chooseLayout,
  WORKSHOP_MAX,
  GRID_MAX,
} from '../index.js';

/**
 * Build a two-level agent tree fixture: one root that delegates to two children,
 * and one of those children delegates again to a grandchild. The extra fields
 * (task, tokens) match the tolerant shapes the swarm logic reads.
 */
function makeTree(): AgentTree {
  return {
    rootAgentId: 'root',
    nodes: {
      root: {
        agentId: 'root',
        provider: 'claude-code',
        status: 'active',
        task: 'orchestrate',
        startedAt: 0,
        children: ['child-a', 'child-b'],
        tokens: { input: 100, output: 40, costUsd: 0.01 },
      },
      'child-a': {
        agentId: 'child-a',
        parentAgentId: 'root',
        provider: 'claude-code',
        status: 'active',
        task: 'research',
        startedAt: 0,
        children: ['grandchild'],
        tokens: { input: 50, output: 20, costUsd: 0.005 },
      },
      grandchild: {
        agentId: 'grandchild',
        parentAgentId: 'child-a',
        provider: 'claude-code',
        status: 'finished',
        task: 'fetch docs',
        startedAt: 0,
        children: [],
        tokens: { input: 10, output: 5, costUsd: 0.001 },
      },
      'child-b': {
        agentId: 'child-b',
        parentAgentId: 'root',
        provider: 'claude-code',
        status: 'waiting',
        task: 'write tests',
        startedAt: 0,
        children: [],
        tokens: { input: 30, output: 10, costUsd: 0.002 },
      },
    },
  };
}

describe('computeRoster', () => {
  it('flattens the tree in pre-order with correct depth and parent links', () => {
    const roster = computeRoster(makeTree());

    // Four nodes total, root first (pre-order).
    expect(roster.map((w) => w.agentId)).toEqual(['root', 'child-a', 'grandchild', 'child-b']);

    // Depth: root 0, its children 1, grandchild 2.
    expect(roster.map((w) => w.depth)).toEqual([0, 1, 2, 1]);
    expect(rosterDepth(roster)).toBe(2);

    // Parent links wire each worker to its delegator.
    const grandchild = roster.find((w) => w.agentId === 'grandchild');
    expect(grandchild?.parent).toBe('child-a');
    expect(roster[0]?.parent).toBeNull();
  });

  it('returns an empty roster for a null or rootless tree', () => {
    expect(computeRoster(null)).toEqual([]);
    expect(computeRoster(undefined)).toEqual([]);
    expect(rosterDepth([])).toBe(-1);
  });
});

describe('delegationEdges', () => {
  it('derives one edge per parent-child link for a two-level tree', () => {
    const edges = delegationEdges(makeTree());

    // N nodes minus 1 = 3 edges.
    expect(edges).toHaveLength(3);
    expect(edges).toContainEqual({ from: 'root', to: 'child-a' });
    expect(edges).toContainEqual({ from: 'root', to: 'child-b' });
    expect(edges).toContainEqual({ from: 'child-a', to: 'grandchild' });
  });
});

describe('aggregateTokens', () => {
  it('sums input, output, and cost across every node', () => {
    const totals = aggregateTokens(makeTree());

    // input: 100 + 50 + 10 + 30 = 190
    expect(totals.input).toBe(190);
    // output: 40 + 20 + 5 + 10 = 75
    expect(totals.output).toBe(75);
    // cost: 0.01 + 0.005 + 0.001 + 0.002 = 0.018
    expect(totals.costUsd).toBeCloseTo(0.018, 6);
  });

  it('zeroes out for an empty tree', () => {
    expect(aggregateTokens(null)).toEqual({ input: 0, output: 0, costUsd: 0 });
  });
});

describe('chooseLayout', () => {
  it('respects the documented thresholds', () => {
    expect(chooseLayout(0)).toBe('workshop');
    expect(chooseLayout(WORKSHOP_MAX)).toBe('workshop');
    expect(chooseLayout(WORKSHOP_MAX + 1)).toBe('grid');
    expect(chooseLayout(GRID_MAX)).toBe('grid');
    expect(chooseLayout(GRID_MAX + 1)).toBe('roster');
  });

  it('clamps invalid counts to workshop', () => {
    expect(chooseLayout(-5)).toBe('workshop');
    expect(chooseLayout(Number.NaN)).toBe('workshop');
  });
});
