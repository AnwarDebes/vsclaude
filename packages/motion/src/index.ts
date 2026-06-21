/**
 * @vsclaude/motion: the event to motion mapper, the brain of the soul.
 *
 * This package turns a normalized stream of AgentEvents into MotionDirectives
 * that drive the Pixie character. Everything here is pure TypeScript with no UI
 * dependencies: the React or native rendering layer consumes these directives
 * later.
 *
 * Public surface:
 * - Mapper / mapEvents: the stateful and batch event to directive engines.
 * - captionFor: human readable captions per event (sacred rule 3).
 * - intensityFor / moodFor: energy and emotion inference.
 * - REST_DIRECTIVE: the initial resting directive, re-exported from contracts.
 */

export { REST_DIRECTIVE } from '@vsclaude/contracts';

export {
  Mapper,
  mapEvents,
  DEFAULT_MAPPER_OPTIONS,
} from './mapper.js';
export type { MapperOptions } from './mapper.js';

export { captionFor, basename, truncate } from './captions.js';

export { intensityFor, moodFor, clamp01 } from './intensity.js';

export {
  stateForEvent,
  gazeForEvent,
  priorityOf,
  outranks,
} from './priority.js';
