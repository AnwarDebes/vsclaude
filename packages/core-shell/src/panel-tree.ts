/**
 * Panel tree model for the vsclaude core shell.
 *
 * The layout is a binary tree of nodes. A leaf holds a single panel by id.
 * A branch is a split, either a "row" (children laid out left to right) or a
 * "column" (children laid out top to bottom). Each child carries a size weight
 * so the renderer can compute proportional widths or heights.
 *
 * Every mutating function is pure: it returns a brand new tree and never
 * touches the input. This keeps the layout trivially undoable and safe to
 * share across the UI without defensive copies at the call sites.
 */

/** Orientation of a split branch. */
export type SplitOrientation = 'row' | 'column';

/** Where a new panel is inserted relative to a target leaf. */
export type SplitSide = 'before' | 'after';

/** A leaf node holding exactly one panel. */
export interface PanelLeaf {
  readonly kind: 'leaf';
  /** Unique id of the panel rendered in this slot. */
  readonly id: string;
}

/** A child of a split: a subtree plus its proportional size weight. */
export interface SplitChild {
  /** Relative weight, always strictly positive. */
  readonly size: number;
  /** The subtree placed in this slot. */
  readonly node: PanelNode;
}

/** A branch node splitting space among two or more children. */
export interface PanelSplit {
  readonly kind: 'split';
  readonly orientation: SplitOrientation;
  readonly children: readonly SplitChild[];
}

/** Any node in the tree. */
export type PanelNode = PanelLeaf | PanelSplit;

/** A type guard for leaf nodes. */
export function isLeaf(node: PanelNode): node is PanelLeaf {
  return node.kind === 'leaf';
}

/** A type guard for split nodes. */
export function isSplit(node: PanelNode): node is PanelSplit {
  return node.kind === 'split';
}

/** Build a leaf node for the given panel id. */
export function leaf(id: string): PanelLeaf {
  return { kind: 'leaf', id };
}

/**
 * Collect the ids of every panel present in a tree, in left to right,
 * depth first order. Useful for validation and for finding focus targets.
 */
export function collectPanelIds(node: PanelNode): string[] {
  if (isLeaf(node)) {
    return [node.id];
  }
  const ids: string[] = [];
  for (const child of node.children) {
    ids.push(...collectPanelIds(child.node));
  }
  return ids;
}

/** Total number of leaf panels in a tree. */
export function panelCount(node: PanelNode): number {
  return collectPanelIds(node).length;
}

/** Return true when the tree contains a panel with the given id. */
export function hasPanel(node: PanelNode, panelId: string): boolean {
  if (isLeaf(node)) {
    return node.id === panelId;
  }
  return node.children.some((child) => hasPanel(child.node, panelId));
}

/**
 * Split an existing panel, inserting a new panel beside it.
 *
 * The matched leaf becomes a split (or, when its parent already matches the
 * requested orientation, the new panel is folded into that parent so we do not
 * accumulate redundant nesting). The two resulting slots share the original
 * slot's space equally. Returns a new tree. Throws when the target panel is not
 * found or the new id already exists.
 */
export function splitPanel(
  tree: PanelNode,
  targetId: string,
  newPanelId: string,
  orientation: SplitOrientation,
  side: SplitSide = 'after',
): PanelNode {
  if (!hasPanel(tree, targetId)) {
    throw new Error(`splitPanel: target panel "${targetId}" not found`);
  }
  if (hasPanel(tree, newPanelId)) {
    throw new Error(`splitPanel: panel "${newPanelId}" already exists`);
  }

  const newLeaf = leaf(newPanelId);

  const transform = (node: PanelNode): PanelNode => {
    if (isLeaf(node)) {
      if (node.id !== targetId) {
        return node;
      }
      const existing: SplitChild = { size: 1, node };
      const inserted: SplitChild = { size: 1, node: newLeaf };
      const children =
        side === 'before' ? [inserted, existing] : [existing, inserted];
      return { kind: 'split', orientation, children };
    }

    // Branch: if this split matches the orientation and directly holds the
    // target leaf, fold the new panel into it rather than nesting a new split.
    if (node.orientation === orientation) {
      const targetIndex = node.children.findIndex(
        (child) => isLeaf(child.node) && child.node.id === targetId,
      );
      if (targetIndex !== -1) {
        const targetChild = node.children[targetIndex];
        if (targetChild === undefined) {
          return node;
        }
        const sharedSize = targetChild.size / 2;
        const insertedChild: SplitChild = { size: sharedSize, node: newLeaf };
        const keptChild: SplitChild = { size: sharedSize, node: targetChild.node };
        const next: SplitChild[] = node.children.slice();
        if (side === 'before') {
          next.splice(targetIndex, 1, insertedChild, keptChild);
        } else {
          next.splice(targetIndex, 1, keptChild, insertedChild);
        }
        return { kind: 'split', orientation: node.orientation, children: next };
      }
    }

    return {
      kind: 'split',
      orientation: node.orientation,
      children: node.children.map((child) => ({
        size: child.size,
        node: transform(child.node),
      })),
    };
  };

  return transform(tree);
}

/**
 * Remove a panel from the tree. A split that drops to a single child collapses
 * into that child so the tree never carries pointless one way splits. Returns a
 * new tree, or null when the removed panel was the last one. Throws when the
 * panel does not exist.
 */
export function removePanel(tree: PanelNode, panelId: string): PanelNode | null {
  if (!hasPanel(tree, panelId)) {
    throw new Error(`removePanel: panel "${panelId}" not found`);
  }

  const prune = (node: PanelNode): PanelNode | null => {
    if (isLeaf(node)) {
      return node.id === panelId ? null : node;
    }

    const survivors: SplitChild[] = [];
    for (const child of node.children) {
      const prunedNode = prune(child.node);
      if (prunedNode !== null) {
        survivors.push({ size: child.size, node: prunedNode });
      }
    }

    if (survivors.length === 0) {
      return null;
    }
    if (survivors.length === 1) {
      const only = survivors[0];
      return only === undefined ? null : only.node;
    }
    return { kind: 'split', orientation: node.orientation, children: survivors };
  };

  return prune(tree);
}

/**
 * Resize a single child of a split by setting an absolute weight for the slot
 * that contains the given panel id, then normalising its siblings so the split
 * still sums to its original total. The size is clamped to a small positive
 * minimum so a slot can never collapse to zero. Returns a new tree. Throws when
 * the panel is not found or the size is not finite and positive.
 */
export function resizePanel(
  tree: PanelNode,
  panelId: string,
  size: number,
): PanelNode {
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error(`resizePanel: size must be a positive finite number`);
  }
  if (!hasPanel(tree, panelId)) {
    throw new Error(`resizePanel: panel "${panelId}" not found`);
  }

  const MIN_SIZE = 0.05;

  const transform = (node: PanelNode): PanelNode => {
    if (isLeaf(node)) {
      return node;
    }

    const directIndex = node.children.findIndex(
      (child) => isLeaf(child.node) && child.node.id === panelId,
    );

    if (directIndex !== -1 && node.children.length > 1) {
      const total = node.children.reduce((sum, child) => sum + child.size, 0);
      const target = node.children[directIndex];
      if (target === undefined) {
        return node;
      }
      const clamped = Math.max(MIN_SIZE, Math.min(size, total - MIN_SIZE));
      const remaining = total - clamped;
      const othersTotal = total - target.size;
      const next = node.children.map((child, index) => {
        if (index === directIndex) {
          return { size: clamped, node: child.node };
        }
        const share =
          othersTotal > 0 ? (child.size / othersTotal) * remaining : remaining / (node.children.length - 1);
        return { size: share, node: child.node };
      });
      return { kind: 'split', orientation: node.orientation, children: next };
    }

    // Not a direct child here: recurse so a nested split can match instead.
    return {
      kind: 'split',
      orientation: node.orientation,
      children: node.children.map((child) => ({
        size: child.size,
        node: transform(child.node),
      })),
    };
  };

  return transform(tree);
}
