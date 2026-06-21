/**
 * Shared shapes for the motion layer (Pixie).
 *
 * The mapping logic (mapEvents) lives in the `motion` package, but the shapes
 * it produces and the canonical event-to-state table live here so the motion
 * engine, the swarm view, the chat panel, and any plugin agree on the same
 * vocabulary.
 *
 * Sacred rule 1 is encoded by {@link EVENT_TO_STATE}: every Pixie state traces
 * back to a real {@link AgentEventType}.
 */
import type { AgentEventType } from './agent-event.js';

/** The behaviors Pixie can perform. Each is a Rive state with entry, idle, and exit blends. */
export type PixieState =
  | 'greeting'
  | 'idle'
  | 'sleeping'
  | 'thinking'
  | 'planning'
  | 'reading'
  | 'typing'
  | 'searching'
  | 'web'
  | 'running'
  | 'debugging'
  | 'building'
  | 'git'
  | 'spawning'
  | 'waiting'
  | 'success'
  | 'confused';

/** Emotional coloring layered on top of a state. */
export type PixieMood = 'calm' | 'focused' | 'excited' | 'struggling';

/** Every Pixie state, for iteration and Storybook coverage. */
export const PIXIE_STATES: readonly PixieState[] = [
  'greeting',
  'idle',
  'sleeping',
  'thinking',
  'planning',
  'reading',
  'typing',
  'searching',
  'web',
  'running',
  'debugging',
  'building',
  'git',
  'spawning',
  'waiting',
  'success',
  'confused',
];

export const PIXIE_MOODS: readonly PixieMood[] = ['calm', 'focused', 'excited', 'struggling'];

/** A normalized gaze direction. Each axis is in the range minus one to one. */
export interface GazeTarget {
  x: number;
  y: number;
}

/**
 * The output of the event-to-motion mapper. The Rive runtime maps these fields
 * directly onto state machine inputs.
 */
export interface MotionDirective {
  state: PixieState;
  mood: PixieMood;
  /** How much is happening, range zero to one. Drives animation energy. */
  intensity: number;
  gaze: GazeTarget;
  /** Plain-language caption shown beside Pixie (sacred rule 3). */
  caption?: string;
  /** The id of the AgentEvent that produced this directive (sacred rule 2). */
  sourceEventId?: string;
}

/**
 * The default, canonical mapping from event type to Pixie state. The mapper in
 * the motion package starts from this table, then applies debouncing,
 * prioritization, and minimum dwell time. Plugins may extend it.
 *
 * Some event types (tool_call, tool_result, command_output, message,
 * token_usage) do not change the state on their own; they refine the caption or
 * intensity of the current state, so they are intentionally absent here.
 */
export const EVENT_TO_STATE: Partial<Record<AgentEventType, PixieState>> = {
  session_start: 'greeting',
  session_end: 'idle',
  thinking: 'thinking',
  todo_update: 'planning',
  file_read: 'reading',
  file_edit: 'typing',
  file_create: 'typing',
  file_delete: 'typing',
  search: 'searching',
  web_fetch: 'web',
  command_run: 'running',
  git_action: 'git',
  subagent_spawned: 'spawning',
  permission_request: 'waiting',
  complete: 'success',
  error: 'confused',
};

/** A neutral resting directive, used before any event arrives. */
export const REST_DIRECTIVE: MotionDirective = {
  state: 'idle',
  mood: 'calm',
  intensity: 0,
  gaze: { x: 0, y: 0 },
};
