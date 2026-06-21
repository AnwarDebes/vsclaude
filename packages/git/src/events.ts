import type { AgentEvent, ProviderId } from '@vsclaude/contracts';
import { createAgentEvent } from '@vsclaude/contracts';

/**
 * The set of git operations this package can describe as agent events.
 *
 * These map onto the kinds of actions a coding agent narrates while it works:
 * staging, committing, branching, pushing, pulling, and so on.
 */
export type GitAction =
  | 'status'
  | 'add'
  | 'commit'
  | 'branch'
  | 'checkout'
  | 'merge'
  | 'push'
  | 'pull'
  | 'fetch'
  | 'stash'
  | 'tag'
  | 'reset';

/** Ordered list of known git actions, useful for validation and iteration. */
export const GIT_ACTIONS: readonly GitAction[] = [
  'status',
  'add',
  'commit',
  'branch',
  'checkout',
  'merge',
  'push',
  'pull',
  'fetch',
  'stash',
  'tag',
  'reset',
] as const;

/**
 * Human friendly captions for each git action. These are the lines the Pixie
 * narrates while the agent runs git, so they are warm and plain spoken.
 */
const ACTION_CAPTIONS: Record<GitAction, string> = {
  status: 'Checking what changed.',
  add: 'Staging your changes.',
  commit: 'Saving your work to git.',
  branch: 'Creating a new branch.',
  checkout: 'Switching branches.',
  merge: 'Merging branches together.',
  push: 'Pushing your work to the remote.',
  pull: 'Pulling the latest changes.',
  fetch: 'Fetching updates from the remote.',
  stash: 'Stashing your changes for later.',
  tag: 'Tagging this point in history.',
  reset: 'Rewinding to an earlier state.',
};

/**
 * Narrow an arbitrary string to a {@link GitAction} when it is known.
 *
 * @param value Candidate action string.
 * @returns True when `value` is one of the supported git actions.
 */
export function isGitAction(value: string): value is GitAction {
  return (GIT_ACTIONS as readonly string[]).includes(value);
}

/**
 * Return the narration caption for a git action.
 *
 * @param action A supported git action.
 * @returns The human readable caption shown to the user.
 */
export function captionForAction(action: GitAction): string {
  return ACTION_CAPTIONS[action];
}

/**
 * Context for building a git action event. Fields beyond `provider` are
 * optional and are folded into the resulting payload when present.
 */
export interface GitActionContext {
  /** Provider the agent is running under (for example a known provider id). */
  readonly provider: ProviderId;
  /** Branch the action targets, when relevant. */
  readonly branch?: string;
  /** Commit message, for commit actions. */
  readonly message?: string;
  /** Files involved in the action, for add or reset. */
  readonly files?: readonly string[];
  /** Remote name, for push, pull, and fetch. */
  readonly remote?: string;
  /** Explicit event id. Defaults to a generated, process-stable id. */
  readonly id?: string;
  /** Session id to thread the event onto. */
  readonly sessionId?: string;
  /** Emitting agent id. Defaults to the root agent. */
  readonly agentId?: string;
  /** Event timestamp in epoch milliseconds. Defaults to the current time. */
  readonly ts?: number;
  /** Optional explicit caption override; defaults to the action caption. */
  readonly caption?: string;
}

let gitEventSeq = 0;

/**
 * Build a normalized `git_action` {@link AgentEvent} for a git operation.
 *
 * The payload conforms to {@link GitActionPayload}: it always carries the
 * action and a caption, and includes branch, message, files, and remote only
 * when the caller supplies them. The event itself is created through
 * {@link createAgentEvent} so it gets a stable id, timestamp, and the frozen
 * schema version.
 *
 * @param action The git action to describe.
 * @param ctx Context describing the operation and its provider.
 * @returns A fully formed git_action agent event.
 */
export function gitActionEvent(action: GitAction, ctx: GitActionContext): AgentEvent {
  const caption = ctx.caption ?? captionForAction(action);

  // The contract's GitActionPayload carries action, ref, and message. The
  // event-level `payload` field is a loose record, so additional narration
  // details (files, remote) ride along without widening the typed payload.
  const payload: Record<string, unknown> = { action };
  if (ctx.branch !== undefined) {
    payload.ref = ctx.branch;
  }
  if (ctx.message !== undefined) {
    payload.message = ctx.message;
  }
  if (ctx.files !== undefined) {
    payload.files = [...ctx.files];
  }
  if (ctx.remote !== undefined) {
    payload.remote = ctx.remote;
  }

  gitEventSeq += 1;
  return createAgentEvent({
    id: ctx.id ?? `git-${gitEventSeq}`,
    sessionId: ctx.sessionId ?? 'session',
    agentId: ctx.agentId ?? 'root',
    ts: ctx.ts ?? Date.now(),
    type: 'git_action',
    provider: ctx.provider,
    payload,
    // The caption belongs on the event (sacred rule 3), not in the payload.
    caption,
  });
}
