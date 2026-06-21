/**
 * @vsclaude/chat
 *
 * Conversation and timeline model for the vsclaude IDE. This package turns a
 * normalized AgentEvent stream into an ordered, inspectable conversation:
 *
 * - {@link buildTimeline} groups raw events into a discriminated union of
 *   TimelineItems, collapsing each tool_call with its matched tool_result and
 *   each command_run with its matched command_output, and turning todo_update
 *   events into plan items.
 * - {@link groupIntoTurns} segments the timeline into user and assistant turns.
 * - {@link inspectorModel} produces a normalized drill-down view for the
 *   tool-call inspector while preserving the exact raw event.
 *
 * This is the pure logic layer. The React / native rendering layer is tracked
 * in ROADMAP.md and lands later.
 */

export { buildTimeline } from './timeline.js';
export { groupIntoTurns } from './turns.js';
export { inspectorModel } from './inspector.js';
export { payloadOf, readString, readOptionalString } from './payloads.js';

export { TIMELINE_ITEM_KINDS } from './types.js';

export type {
  TurnRole,
  TimelineItemKind,
  TimelineItem,
  MessageTimelineItem,
  ThinkingTimelineItem,
  ToolCallTimelineItem,
  FileChangeTimelineItem,
  CommandTimelineItem,
  PlanTimelineItem,
  Turn,
  InspectorField,
  InspectorModel,
} from './types.js';
