import { describe, expect, it } from 'vitest';
import {
  CommandRegistry,
  collectPanelIds,
  hasPanel,
  isLayoutValid,
  isSplit,
  layoutForMode,
  leaf,
  panelCount,
  removePanel,
  resizePanel,
  splitPanel,
  type Command,
  type PanelNode,
} from '../index.js';

describe('panel tree', () => {
  it('splits a single leaf into a two child branch', () => {
    const tree: PanelNode = leaf('editor');
    const next = splitPanel(tree, 'editor', 'terminal', 'column', 'after');

    // Original tree is untouched (immutability).
    expect(tree).toEqual({ kind: 'leaf', id: 'editor' });

    expect(isSplit(next)).toBe(true);
    expect(panelCount(next)).toBe(2);
    expect(collectPanelIds(next)).toEqual(['editor', 'terminal']);
    expect(hasPanel(next, 'terminal')).toBe(true);
  });

  it('folds a same orientation split instead of nesting', () => {
    let tree: PanelNode = leaf('a');
    tree = splitPanel(tree, 'a', 'b', 'row', 'after');
    tree = splitPanel(tree, 'b', 'c', 'row', 'after');

    // All three live as direct children of one row split, not nested splits.
    expect(isSplit(tree)).toBe(true);
    if (isSplit(tree)) {
      expect(tree.children).toHaveLength(3);
      expect(tree.children.every((child) => child.node.kind === 'leaf')).toBe(true);
    }
    expect(collectPanelIds(tree)).toEqual(['a', 'b', 'c']);
  });

  it('collapses a split when removing down to one child', () => {
    let tree: PanelNode = leaf('editor');
    tree = splitPanel(tree, 'editor', 'terminal', 'column', 'after');

    const removed = removePanel(tree, 'terminal');
    expect(removed).toEqual({ kind: 'leaf', id: 'editor' });

    // Removing the final panel yields null.
    const empty = removePanel(removed as PanelNode, 'editor');
    expect(empty).toBeNull();
  });

  it('rejects removing a panel that does not exist', () => {
    const tree: PanelNode = leaf('editor');
    expect(() => removePanel(tree, 'ghost')).toThrow();
  });

  it('resizes a slot and renormalises siblings to preserve the total', () => {
    let tree: PanelNode = leaf('a');
    tree = splitPanel(tree, 'a', 'b', 'row', 'after');
    // Now: row split with two equal children, total size 2.

    const resized = resizePanel(tree, 'a', 1.5);
    expect(isSplit(resized)).toBe(true);
    if (isSplit(resized)) {
      const total = resized.children.reduce((sum, child) => sum + child.size, 0);
      expect(total).toBeCloseTo(2, 6);
      const first = resized.children[0];
      expect(first?.size).toBeCloseTo(1.5, 6);
    }
  });

  it('clamps a resize so a slot never collapses to zero', () => {
    let tree: PanelNode = leaf('a');
    tree = splitPanel(tree, 'a', 'b', 'row', 'after');

    const resized = resizePanel(tree, 'a', 1000);
    if (isSplit(resized)) {
      const second = resized.children[1];
      expect(second?.size).toBeGreaterThan(0);
    }
  });
});

describe('presentation helpers', () => {
  it('produces a valid default layout and a single panel for focus mode', () => {
    const cozy = layoutForMode('cozy', 'editor');
    expect(isLayoutValid(cozy)).toBe(true);
    expect(panelCount(cozy)).toBe(2);

    const focus = layoutForMode('focus', 'editor');
    expect(focus).toEqual({ kind: 'leaf', id: 'editor' });
  });
});

function makeCommand(id: string, title: string, keywords?: string[]): Command {
  return { id, title, run: () => {}, keywords };
}

describe('command registry', () => {
  it('registers, lists, and unregisters commands', () => {
    const registry = new CommandRegistry();
    registry.register(makeCommand('open', 'Open File'));
    registry.register(makeCommand('save', 'Save File'));

    expect(registry.size).toBe(2);
    // list is sorted alphabetically by title.
    expect(registry.list().map((c) => c.id)).toEqual(['open', 'save']);

    expect(registry.unregister('open')).toBe(true);
    expect(registry.unregister('open')).toBe(false);
    expect(registry.has('open')).toBe(false);
  });

  it('throws on duplicate command ids', () => {
    const registry = new CommandRegistry();
    registry.register(makeCommand('x', 'X Command'));
    expect(() => registry.register(makeCommand('x', 'Other'))).toThrow();
  });

  it('ranks an exact prefix match above a scattered subsequence match', () => {
    const registry = new CommandRegistry();
    registry.register(makeCommand('open', 'Open File'));
    registry.register(makeCommand('reopen', 'Reopen Closed Panel'));

    const results = registry.fuzzyFind('open');
    expect(results).toHaveLength(2);
    // "Open File" starts with the query so it must outrank "Reopen ...".
    expect(results[0]?.command.id).toBe('open');
    expect(results[0]?.score).toBeGreaterThan(results[1]?.score ?? 0);
  });

  it('matches via keywords and excludes non matches', () => {
    const registry = new CommandRegistry();
    registry.register(makeCommand('theme', 'Toggle Theme', ['dark', 'light', 'appearance']));
    registry.register(makeCommand('quit', 'Quit Application'));

    const byKeyword = registry.fuzzyFind('dark');
    expect(byKeyword).toHaveLength(1);
    expect(byKeyword[0]?.command.id).toBe('theme');

    // A query that is not a subsequence of anything returns nothing.
    expect(registry.fuzzyFind('zzzz')).toHaveLength(0);
  });

  it('runs a command and rejects unknown ids', async () => {
    const registry = new CommandRegistry();
    let ran = false;
    registry.register({ id: 'go', title: 'Go', run: () => { ran = true; } });

    await registry.run('go');
    expect(ran).toBe(true);
    await expect(registry.run('missing')).rejects.toThrow();
  });
});
