import type {
  AgentEvent,
  AgentNode,
  AgentTree,
  AgentStatus,
  ProviderId,
  SubagentSpawnedPayload,
  SubagentFinishedPayload,
  TokenUsagePayload,
  ErrorPayload,
  PayloadFor,
} from '@vsclaude/contracts';

/**
 * Status values that represent a terminal (no longer running) agent. Once a
 * node reaches one of these it will not be moved back to a running state by a
 * later `complete` or `token_usage` event.
 */
export const TERMINAL_STATUSES: ReadonlySet<AgentStatus> = new Set<AgentStatus>([
  'finished',
  'error',
  'cancelled',
]);

/**
 * Narrows an {@link AgentEvent} to a concrete payload for a given event type.
 * Returns the typed payload when the event matches, otherwise `undefined`.
 *
 * The {@link AgentEvent} union keeps `payload` loose (a record), so the runtime
 * `type` check is what gives us the correlation; we assert through `unknown`
 * once the discriminant matches.
 */
function payloadIf<T extends AgentEvent['type']>(
  event: AgentEvent,
  type: T,
): PayloadFor<T> | undefined {
  if (event.type === type && event.payload !== undefined) {
    return event.payload as unknown as PayloadFor<T>;
  }
  return undefined;
}

/** Creates a fresh {@link AgentNode} in the `spawning` state with zeroed tokens. */
function newNode(
  agentId: string,
  parentAgentId: string | undefined,
  provider: ProviderId,
  task: string | undefined,
  startedAt: number,
  status: AgentStatus,
): AgentNode {
  const node: AgentNode = {
    agentId,
    provider,
    status,
    startedAt,
    children: [],
    tokens: { input: 0, output: 0 },
  };
  if (parentAgentId !== undefined) {
    node.parentAgentId = parentAgentId;
  }
  if (task !== undefined) {
    node.task = task;
  }
  return node;
}

/** Ensures a node exists for `agentId`, creating an `active` one if needed. */
function ensureNode(
  nodes: Map<string, AgentNode>,
  event: AgentEvent,
): AgentNode {
  const existing = nodes.get(event.agentId);
  if (existing) {
    return existing;
  }
  const created = newNode(
    event.agentId,
    event.parentAgentId,
    event.provider,
    undefined,
    event.ts,
    'active',
  );
  nodes.set(event.agentId, created);
  // Late-discovered nodes still wire themselves into their parent so the tree
  // stays connected even when a `session_start` was never observed.
  linkChild(nodes, created.parentAgentId, created.agentId);
  return created;
}

/** Appends `childId` to a parent's `children` list, de-duplicated. */
function linkChild(
  nodes: Map<string, AgentNode>,
  parentId: string | undefined,
  childId: string,
): void {
  if (parentId === undefined || parentId === childId) {
    return;
  }
  const parent = nodes.get(parentId);
  if (parent && !parent.children.includes(childId)) {
    parent.children.push(childId);
  }
}

/** Adds token counts onto a node, clamping negatives to zero. */
function addTokens(node: AgentNode, input: number, output: number): void {
  const tokens = node.tokens ?? { input: 0, output: 0 };
  tokens.input += Math.max(0, input);
  tokens.output += Math.max(0, output);
  node.tokens = tokens;
}

/** Maps a finished subagent status onto the richer {@link AgentStatus} union. */
function mapFinishStatus(status: SubagentFinishedPayload['status']): AgentStatus {
  switch (status) {
    case 'success':
      return 'finished';
    case 'error':
      return 'error';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'finished';
  }
}

/**
 * Pure reducer that folds an ordered list of {@link AgentEvent}s into an
 * {@link AgentTree}.
 *
 * Delegation structure is built from:
 * - `session_start`: registers (or activates) the root orchestrator agent.
 * - `subagent_spawned`: attaches a child worker node to its parent.
 * - `subagent_finished`: marks a worker terminal and records its outcome.
 *
 * Per-node accounting is updated from:
 * - `token_usage`: accumulates input/output tokens (and cost when present).
 * - `complete`: marks the emitting agent `finished` unless already terminal.
 * - `error`: marks the emitting agent `error`.
 *
 * The function is deterministic and side-effect free, so a session can be fully
 * rebuilt by replaying its event log.
 */
export function reduceAgentTree(events: readonly AgentEvent[]): AgentTree {
  const nodes = new Map<string, AgentNode>();
  let rootAgentId = '';

  for (const event of events) {
    switch (event.type) {
      case 'session_start': {
        const node =
          nodes.get(event.agentId) ??
          newNode(
            event.agentId,
            event.parentAgentId,
            event.provider,
            undefined,
            event.ts,
            'active',
          );
        node.status = node.status === 'spawning' ? 'active' : node.status;
        nodes.set(event.agentId, node);
        linkChild(nodes, node.parentAgentId, node.agentId);
        if (rootAgentId === '' && event.parentAgentId === undefined) {
          rootAgentId = event.agentId;
        }
        break;
      }
      case 'subagent_spawned': {
        const payload = payloadIf(event, 'subagent_spawned');
        if (payload) {
          applySpawn(nodes, event, payload);
        }
        break;
      }
      case 'subagent_finished': {
        const payload = payloadIf(event, 'subagent_finished');
        if (payload) {
          applyFinish(nodes, payload, event.ts);
        }
        break;
      }
      case 'token_usage': {
        const payload = payloadIf(event, 'token_usage');
        if (payload) {
          applyTokens(nodes, event, payload);
        }
        break;
      }
      case 'complete': {
        applyComplete(ensureNode(nodes, event), event.ts);
        break;
      }
      case 'error': {
        const payload = payloadIf(event, 'error');
        applyError(ensureNode(nodes, event), payload, event.ts);
        break;
      }
      default: {
        // Any other event still proves the agent exists; register it so token
        // and lifecycle events that arrive later have a node to land on.
        ensureNode(nodes, event);
        break;
      }
    }
  }

  // Fall back to the first parentless node if no explicit session root was set.
  if (rootAgentId === '') {
    for (const node of nodes.values()) {
      if (node.parentAgentId === undefined) {
        rootAgentId = node.agentId;
        break;
      }
    }
  }

  return {
    rootAgentId,
    nodes: Object.fromEntries(nodes),
  };
}

/** Handles a `subagent_spawned` event by creating and linking the child node. */
function applySpawn(
  nodes: Map<string, AgentNode>,
  event: AgentEvent,
  payload: SubagentSpawnedPayload,
): void {
  const childId = payload.childAgentId;
  const parentId = event.agentId;
  const provider: ProviderId = payload.provider ?? event.provider;

  const existing = nodes.get(childId);
  if (existing) {
    if (existing.parentAgentId === undefined) {
      existing.parentAgentId = parentId;
    }
    if (existing.task === undefined) {
      existing.task = payload.task;
    }
  } else {
    nodes.set(
      childId,
      newNode(childId, parentId, provider, payload.task, event.ts, 'spawning'),
    );
  }

  // Make sure the spawning parent exists too, then wire the edge.
  if (!nodes.has(parentId)) {
    nodes.set(
      parentId,
      newNode(parentId, event.parentAgentId, event.provider, undefined, event.ts, 'active'),
    );
  }
  linkChild(nodes, parentId, childId);
}

/** Handles a `subagent_finished` event, marking the child terminal. */
function applyFinish(
  nodes: Map<string, AgentNode>,
  payload: SubagentFinishedPayload,
  ts: number,
): void {
  const node = nodes.get(payload.childAgentId);
  if (!node) {
    return;
  }
  node.status = mapFinishStatus(payload.status);
  node.finishedAt = ts;
}

/** Accumulates token usage onto the emitting agent's node. */
function applyTokens(
  nodes: Map<string, AgentNode>,
  event: AgentEvent,
  payload: TokenUsagePayload,
): void {
  const node = ensureNode(nodes, event);
  addTokens(node, payload.inputTokens, payload.outputTokens);
  if (typeof payload.costUsd === 'number') {
    const tokens = node.tokens ?? { input: 0, output: 0 };
    tokens.costUsd = (tokens.costUsd ?? 0) + Math.max(0, payload.costUsd);
    node.tokens = tokens;
  }
}

/** Marks a node `finished` on `complete`, unless it is already terminal. */
function applyComplete(node: AgentNode, ts: number): void {
  if (!TERMINAL_STATUSES.has(node.status)) {
    node.status = 'finished';
  }
  node.finishedAt = node.finishedAt ?? ts;
}

/** Marks a node `error` on an `error` event and records the message. */
function applyError(node: AgentNode, payload: ErrorPayload | undefined, ts: number): void {
  node.status = 'error';
  node.finishedAt = node.finishedAt ?? ts;
  // The error message is surfaced via the event timeline; the tree only tracks
  // status and timing, so we intentionally do not stash the message on the node.
  void payload;
}
