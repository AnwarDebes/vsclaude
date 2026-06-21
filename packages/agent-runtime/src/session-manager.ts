import type { AgentEvent, AgentTree } from '@vsclaude/contracts';
import { reduceAgentTree } from './reduce.js';

/** A listener invoked with the latest {@link AgentTree} after every change. */
export type TreeListener = (tree: AgentTree) => void;

/** Releases a subscription registered through {@link SessionManager.subscribe}. */
export type Unsubscribe = () => void;

/** An empty tree used before any event has been ingested. */
const EMPTY_TREE: AgentTree = Object.freeze({
  rootAgentId: '',
  nodes: {},
});

/**
 * Stateful driver around {@link reduceAgentTree}.
 *
 * A {@link SessionManager} owns the ordered event log for one session, keeps the
 * current {@link AgentTree}, and notifies subscribers whenever the tree changes.
 * It is deliberately incremental at the API level (you call {@link ingest} per
 * event) but recomputes from the full log so the result is always identical to
 * a cold replay, which keeps correctness easy to reason about.
 *
 * The class holds no timers, sockets, or I/O. It is pure domain logic that a
 * transport layer (IPC, WebSocket, or a provider adapter) feeds.
 */
export class SessionManager {
  private readonly events: AgentEvent[] = [];
  private readonly listeners = new Set<TreeListener>();
  private tree: AgentTree = EMPTY_TREE;

  /**
   * Constructs a manager, optionally seeded with a prior event log (for example
   * when restoring a {@link import('@vsclaude/contracts').PersistedSession}).
   */
  constructor(initialEvents: readonly AgentEvent[] = []) {
    if (initialEvents.length > 0) {
      this.events.push(...initialEvents);
      this.tree = reduceAgentTree(this.events);
    }
  }

  /**
   * Ingests a single event, recomputes the tree, and notifies subscribers when
   * the tree changed. Returns the new tree for convenience.
   */
  ingest(event: AgentEvent): AgentTree {
    this.events.push(event);
    const next = reduceAgentTree(this.events);
    const changed = !treesEqual(this.tree, next);
    this.tree = next;
    if (changed) {
      this.emit();
    }
    return this.tree;
  }

  /**
   * Ingests a batch of events. The tree is recomputed once at the end and
   * subscribers are notified at most once, which avoids redundant churn when
   * replaying a backlog.
   */
  ingestAll(events: readonly AgentEvent[]): AgentTree {
    if (events.length === 0) {
      return this.tree;
    }
    this.events.push(...events);
    const next = reduceAgentTree(this.events);
    const changed = !treesEqual(this.tree, next);
    this.tree = next;
    if (changed) {
      this.emit();
    }
    return this.tree;
  }

  /** Returns the current immutable tree snapshot. */
  getTree(): AgentTree {
    return this.tree;
  }

  /** Returns a defensive copy of the ingested event log. */
  getEvents(): readonly AgentEvent[] {
    return this.events.slice();
  }

  /** Number of events ingested so far. */
  get eventCount(): number {
    return this.events.length;
  }

  /**
   * Registers a listener invoked on every tree change. The listener is called
   * immediately with the current tree so subscribers start from a known state.
   * Returns a function that removes the listener.
   */
  subscribe(listener: TreeListener): Unsubscribe {
    this.listeners.add(listener);
    listener(this.tree);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Clears the event log, resets the tree, and notifies subscribers. */
  reset(): void {
    this.events.length = 0;
    this.tree = EMPTY_TREE;
    this.emit();
  }

  /** Notifies all current listeners with the current tree. */
  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.tree);
    }
  }
}

/**
 * Structural equality for two trees, used to suppress no-op notifications.
 * Compares the root id, the node id set, and each node's mutable fields.
 */
function treesEqual(a: AgentTree, b: AgentTree): boolean {
  if (a.rootAgentId !== b.rootAgentId) {
    return false;
  }
  const aKeys = Object.keys(a.nodes);
  const bKeys = Object.keys(b.nodes);
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  for (const key of aKeys) {
    const an = a.nodes[key];
    const bn = b.nodes[key];
    if (!an || !bn) {
      return false;
    }
    if (
      an.status !== bn.status ||
      an.finishedAt !== bn.finishedAt ||
      an.children.length !== bn.children.length ||
      (an.tokens?.input ?? 0) !== (bn.tokens?.input ?? 0) ||
      (an.tokens?.output ?? 0) !== (bn.tokens?.output ?? 0)
    ) {
      return false;
    }
    for (let i = 0; i < an.children.length; i += 1) {
      if (an.children[i] !== bn.children[i]) {
        return false;
      }
    }
  }
  return true;
}
