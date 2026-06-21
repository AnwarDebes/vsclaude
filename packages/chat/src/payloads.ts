import type { AgentEvent, PayloadFor, AgentEventType } from '@vsclaude/contracts';

/**
 * Returns the typed payload for an event when its `type` matches the requested
 * event type, otherwise undefined. This centralizes the narrowing so the rest
 * of the package never has to cast event payloads.
 */
export function payloadOf<T extends AgentEventType>(
  event: AgentEvent,
  type: T,
): PayloadFor<T> | undefined {
  if (event.type !== type) {
    return undefined;
  }
  // `event.type === type` narrows the payload within the contracts map.
  return event.payload as PayloadFor<T>;
}

/**
 * Reads a string property from an unknown record, returning a fallback when the
 * value is absent or not a string. Used to defensively pull optional fields
 * (toolUseId, path, command) without assuming shape.
 */
export function readString(
  source: unknown,
  key: string,
  fallback: string,
): string {
  if (typeof source !== 'object' || source === null) {
    return fallback;
  }
  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : fallback;
}

/**
 * Reads an optional string property from an unknown record, returning undefined
 * when absent or not a string.
 */
export function readOptionalString(
  source: unknown,
  key: string,
): string | undefined {
  if (typeof source !== 'object' || source === null) {
    return undefined;
  }
  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}
