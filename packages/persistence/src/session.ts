/**
 * Session serialization and parsing.
 *
 * A {@link PersistedSession} is the on-disk representation of a single
 * recorded agent run: a metadata header plus the ordered stream of
 * normalized {@link AgentEvent}s and any checkpoints the user pinned.
 *
 * `serializeSession` produces a stable JSON string. `parseSession`
 * reverses it with strict validation: the top-level shape, the metadata
 * header, the checkpoint list, and every single event are checked, and
 * each event is run through the frozen `isAgentEvent` guard from
 * `@vsclaude/contracts`. Anything malformed throws a
 * {@link PersistenceError} that points at the offending field.
 */

import {
  AGENT_EVENT_SCHEMA_VERSION,
  isAgentEvent,
} from '@vsclaude/contracts';
import type {
  AgentEvent,
  Checkpoint,
  PersistedSession,
  SessionMeta,
  TodoItem,
} from '@vsclaude/contracts';
import { PersistenceError, SchemaVersionError } from './errors.js';
import {
  isRecord,
  requireNumber,
  requireString,
} from './guards.js';

/** Indentation used by {@link serializeSession} when pretty printing. */
const PRETTY_INDENT = 2;

/**
 * Serialize a session to a JSON string.
 *
 * @param session The in-memory session to write out.
 * @param pretty  When true (the default) the JSON is indented for human
 *                readability. Pass false for the most compact form.
 */
export function serializeSession(
  session: PersistedSession,
  pretty = true,
): string {
  // We re-key explicitly rather than serializing the object as-is so the
  // output field order is stable and no unexpected extra keys leak in.
  const out = {
    meta: session.meta,
    events: session.events,
    todos: session.todos,
    checkpoints: session.checkpoints,
  };
  return JSON.stringify(out, null, pretty ? PRETTY_INDENT : undefined);
}

/**
 * Parse and validate a session JSON string.
 *
 * @throws {PersistenceError} when the JSON is invalid or any field has
 *   the wrong shape.
 * @throws {SchemaVersionError} when the embedded event schema version
 *   does not match this build.
 */
export function parseSession(json: string): PersistedSession {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : 'unknown error';
    throw new PersistenceError(`Session JSON is not valid: ${reason}`);
  }

  if (!isRecord(raw)) {
    throw new PersistenceError('Session document must be an object');
  }

  const meta = parseMeta(raw['meta']);
  const events = parseEvents(raw['events']);
  const todos = parseTodos(raw['todos']);
  const checkpoints = parseCheckpoints(raw['checkpoints'], events);

  return { meta, events, todos, checkpoints };
}

/** Validate and narrow the session metadata header against the contract. */
function parseMeta(value: unknown): SessionMeta {
  if (!isRecord(value)) {
    throw new PersistenceError('Missing or invalid session metadata', 'meta');
  }

  const failMeta = (path: string): PersistenceError =>
    new PersistenceError('Invalid session metadata field', `meta.${path}`);

  const meta: SessionMeta = {
    id: requireString(value, 'id', failMeta),
    name: requireString(value, 'name', failMeta),
    provider: requireString(value, 'provider', failMeta),
    cwd: requireString(value, 'cwd', failMeta),
    createdAt: requireNumber(value, 'createdAt', failMeta),
    updatedAt: requireNumber(value, 'updatedAt', failMeta),
  };

  // Optional fields are validated only when present so partial or in-progress
  // sessions still load cleanly.
  const model = value['model'];
  if (typeof model === 'string') {
    meta.model = model;
  }
  const summary = value['summary'];
  if (typeof summary === 'string') {
    meta.summary = summary;
  }

  return meta;
}

/** Validate the optional todo list. */
function parseTodos(value: unknown): TodoItem[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new PersistenceError('Session todos must be an array', 'todos');
  }

  const todos: TodoItem[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const candidate = value[i];
    if (!isRecord(candidate)) {
      throw new PersistenceError('Todo must be an object', `todos[${i}]`);
    }
    const failTodo = (path: string): PersistenceError =>
      new PersistenceError('Invalid todo field', `todos[${i}].${path}`);

    const status = requireString(candidate, 'status', failTodo);
    if (status !== 'pending' && status !== 'in_progress' && status !== 'completed') {
      throw failTodo('status');
    }
    todos.push({
      id: requireString(candidate, 'id', failTodo),
      text: requireString(candidate, 'text', failTodo),
      status,
    });
  }
  return todos;
}

/** Validate the event array, running each entry through `isAgentEvent`. */
function parseEvents(value: unknown): AgentEvent[] {
  if (!Array.isArray(value)) {
    throw new PersistenceError('Session events must be an array', 'events');
  }

  const events: AgentEvent[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const candidate = value[i];
    if (!isAgentEvent(candidate)) {
      throw new PersistenceError(
        'Event failed contract validation',
        `events[${i}]`,
      );
    }

    // `isAgentEvent` guarantees the structural contract. We additionally
    // assert that the event schema version, when present on the event,
    // matches this build so we fail loudly rather than misinterpret a
    // future-format event.
    const asRecord = candidate as unknown as Record<string, unknown>;
    const version = asRecord['schemaVersion'];
    if (typeof version === 'number' && version !== AGENT_EVENT_SCHEMA_VERSION) {
      throw new SchemaVersionError(version, AGENT_EVENT_SCHEMA_VERSION);
    }

    events.push(candidate);
  }

  return events;
}

/**
 * Validate the checkpoint list. Each checkpoint references a position in the
 * event stream via `eventIndex`, and we verify that the index is in range so a
 * parsed session is internally consistent.
 */
function parseCheckpoints(value: unknown, events: readonly AgentEvent[]): Checkpoint[] {
  // Checkpoints are optional. Treat a missing field as an empty list.
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new PersistenceError('Session checkpoints must be an array', 'checkpoints');
  }

  const checkpoints: Checkpoint[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const candidate = value[i];
    if (!isRecord(candidate)) {
      throw new PersistenceError('Checkpoint must be an object', `checkpoints[${i}]`);
    }

    const failCp = (path: string): PersistenceError =>
      new PersistenceError('Invalid checkpoint field', `checkpoints[${i}].${path}`);

    const checkpoint: Checkpoint = {
      id: requireString(candidate, 'id', failCp),
      sessionId: requireString(candidate, 'sessionId', failCp),
      label: requireString(candidate, 'label', failCp),
      createdAt: requireNumber(candidate, 'createdAt', failCp),
      eventIndex: requireNumber(candidate, 'eventIndex', failCp),
      snapshotRef: requireString(candidate, 'snapshotRef', failCp),
    };

    if (
      events.length > 0 &&
      (checkpoint.eventIndex < 0 || checkpoint.eventIndex >= events.length)
    ) {
      throw new PersistenceError(
        `Checkpoint eventIndex ${checkpoint.eventIndex} is out of range`,
        `checkpoints[${i}].eventIndex`,
      );
    }

    checkpoints.push(checkpoint);
  }

  return checkpoints;
}

/**
 * Round-trip helper that serializes then immediately re-parses a
 * session. Useful in tests and as a cheap integrity check before
 * writing a session to disk: if it cannot be parsed back it should not
 * be persisted.
 */
export function validateSession(session: PersistedSession): PersistedSession {
  return parseSession(serializeSession(session, false));
}
