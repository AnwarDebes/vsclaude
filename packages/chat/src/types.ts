import type {
  AgentEvent,
  MessagePayload,
  ThinkingPayload,
  ToolCallPayload,
  ToolResultPayload,
  FilePayload,
  FileEditPayload,
  CommandRunPayload,
  CommandOutputPayload,
  TodoItem,
  ProviderId,
} from '@vsclaude/contracts';

/**
 * The role that authored a span of the conversation. Tool activity, thinking,
 * and assistant messages all belong to the assistant side; only explicit user
 * messages belong to the user side.
 */
export type TurnRole = 'user' | 'assistant';

/**
 * Discriminant strings for the {@link TimelineItem} union. Kept as a const
 * record so consumers can reference stable literals without importing the
 * union members directly.
 */
export const TIMELINE_ITEM_KINDS = {
  message: 'message',
  thinking: 'thinking',
  toolCall: 'toolCall',
  fileChange: 'fileChange',
  command: 'command',
  plan: 'plan',
} as const;

export type TimelineItemKind =
  (typeof TIMELINE_ITEM_KINDS)[keyof typeof TIMELINE_ITEM_KINDS];

/** Common fields shared by every timeline item. */
interface TimelineItemBase {
  /** Stable identity for the item, derived from the source event id(s). */
  readonly id: string;
  /** Millisecond epoch timestamp used for ordering. */
  readonly ts: number;
  /** Monotonic sequence number from the source event, used as a tie-breaker. */
  readonly seq: number;
  /** The provider that emitted the source event(s). */
  readonly provider: ProviderId;
  /** Session this item belongs to, when the source event carried one. */
  readonly sessionId: string | undefined;
}

/** An assistant or user chat message. */
export interface MessageTimelineItem extends TimelineItemBase {
  readonly kind: 'message';
  readonly role: TurnRole;
  readonly payload: MessagePayload;
  readonly event: AgentEvent;
}

/** An assistant reasoning / thinking block. */
export interface ThinkingTimelineItem extends TimelineItemBase {
  readonly kind: 'thinking';
  readonly payload: ThinkingPayload;
  readonly event: AgentEvent;
}

/**
 * A tool invocation collapsed together with its matched result. When the
 * result has not arrived yet, {@link result} is undefined and {@link status}
 * is 'pending'.
 */
export interface ToolCallTimelineItem extends TimelineItemBase {
  readonly kind: 'toolCall';
  readonly toolUseId: string;
  readonly toolName: string;
  readonly call: ToolCallPayload;
  readonly callEvent: AgentEvent;
  readonly result: ToolResultPayload | undefined;
  readonly resultEvent: AgentEvent | undefined;
  readonly status: 'pending' | 'ok' | 'error';
}

/** A file create / write / edit operation. */
export interface FileChangeTimelineItem extends TimelineItemBase {
  readonly kind: 'fileChange';
  readonly path: string;
  readonly payload: FilePayload | FileEditPayload;
  readonly event: AgentEvent;
}

/**
 * A shell command run, collapsed with its captured output when one is
 * available.
 */
export interface CommandTimelineItem extends TimelineItemBase {
  readonly kind: 'command';
  readonly command: string;
  readonly run: CommandRunPayload;
  readonly runEvent: AgentEvent;
  readonly output: CommandOutputPayload | undefined;
  readonly outputEvent: AgentEvent | undefined;
}

/** A plan / todo list snapshot derived from a todo_update event. */
export interface PlanTimelineItem extends TimelineItemBase {
  readonly kind: 'plan';
  readonly todos: readonly TodoItem[];
  readonly event: AgentEvent;
}

/**
 * Ordered, inspectable unit of the conversation timeline. This is a
 * discriminated union keyed on {@link TimelineItemBase} `kind`.
 */
export type TimelineItem =
  | MessageTimelineItem
  | ThinkingTimelineItem
  | ToolCallTimelineItem
  | FileChangeTimelineItem
  | CommandTimelineItem
  | PlanTimelineItem;

/**
 * A contiguous run of timeline items attributed to a single role. User turns
 * hold the user's message(s); assistant turns hold everything the agent did in
 * response, in order.
 */
export interface Turn {
  readonly id: string;
  readonly role: TurnRole;
  readonly startTs: number;
  readonly endTs: number;
  readonly items: readonly TimelineItem[];
}

/** A single labeled field shown in the inspector drill-down. */
export interface InspectorField {
  readonly label: string;
  readonly value: string;
}

/**
 * Normalized view of a single event for the tool-call inspector. The `raw`
 * field MUST be the untouched source event so the inspector can always reveal
 * the exact data the provider sent (sacred rule 2).
 */
export interface InspectorModel {
  readonly title: string;
  readonly fields: readonly InspectorField[];
  readonly raw: AgentEvent;
}
