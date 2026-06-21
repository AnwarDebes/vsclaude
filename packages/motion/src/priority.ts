import type {
  AgentEvent,
  PixieState,
  GazeTarget,
} from '@vsclaude/contracts';
import { EVENT_TO_STATE } from '@vsclaude/contracts';

/**
 * State selection helpers: turn a raw event into a target PixieState, rank
 * states by importance, and decide where the Pixie should look.
 */

/**
 * Priority weights per state. Higher wins. The cardinal rule (sacred rule
 * driven design) is that a permission request, which maps to 'waiting', must
 * always beat ambient background activity like reading or searching. An active
 * error also outranks calm work so the user notices trouble.
 */
const STATE_PRIORITY: Partial<Record<PixieState, number>> = {
  sleeping: 0,
  idle: 0,
  greeting: 5,
  reading: 10,
  web: 11,
  searching: 12,
  planning: 14,
  thinking: 15,
  git: 18,
  typing: 20,
  running: 22,
  building: 24,
  spawning: 30,
  debugging: 40,
  success: 60,
  confused: 80,
  waiting: 100,
};

/**
 * Look up the numeric priority for a state. Unknown states are treated as
 * low priority ambient activity.
 */
export function priorityOf(state: PixieState): number {
  const weight = STATE_PRIORITY[state];
  return typeof weight === 'number' ? weight : 5;
}

/**
 * Map an event to its target PixieState using the frozen EVENT_TO_STATE table
 * from contracts. Falls back to 'idle' when the table has no entry, which keeps
 * the function total for any event the contracts add later.
 */
export function stateForEvent(event: AgentEvent): PixieState {
  return EVENT_TO_STATE[event.type] ?? 'idle';
}

/**
 * Return true when candidate should replace the current state purely on
 * priority grounds (ignoring dwell time, which the Mapper layers on top).
 */
export function outranks(candidate: PixieState, current: PixieState): boolean {
  return priorityOf(candidate) > priorityOf(current);
}

/** Named gaze directions mapped to normalized coordinates (each axis -1..1). */
type GazeLabel = 'editor' | 'terminal' | 'user' | 'away' | 'forward';

const GAZE_COORDS: Record<GazeLabel, GazeTarget> = {
  editor: { x: -0.4, y: 0.1 },
  terminal: { x: -0.3, y: 0.5 },
  user: { x: 0, y: -0.2 },
  away: { x: 0.5, y: -0.3 },
  forward: { x: 0, y: 0 },
};

/**
 * Derive a gaze target from an event so the Pixie looks at what it is touching.
 * File and command events point at the editor or terminal; permission and error
 * events point at the user to demand attention; otherwise the Pixie looks
 * forward.
 */
export function gazeForEvent(event: AgentEvent): GazeTarget {
  switch (event.type) {
    case 'file_read':
    case 'file_edit':
    case 'file_create':
    case 'file_delete':
    case 'search':
      return GAZE_COORDS.editor;
    case 'command_run':
    case 'command_output':
      return GAZE_COORDS.terminal;
    case 'permission_request':
    case 'error':
      return GAZE_COORDS.user;
    case 'thinking':
      return GAZE_COORDS.away;
    default:
      return GAZE_COORDS.forward;
  }
}
