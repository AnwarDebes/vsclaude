import type { AgentEvent } from '@vsclaude/contracts';
import type { InspectorField, InspectorModel } from './types.js';
import { readOptionalString } from './payloads.js';

/**
 * Renders an unknown value into a compact, single-line string for display in an
 * inspector field. Objects and arrays are JSON-encoded; primitives are
 * stringified directly; undefined and null become empty.
 */
function renderValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

/**
 * Flattens the top level of an event payload into labeled inspector fields.
 * Nested values are JSON-encoded so the inspector shows a stable, readable
 * representation without losing information.
 */
function fieldsFromPayload(payload: unknown): InspectorField[] {
  if (typeof payload !== 'object' || payload === null) {
    return payload === undefined
      ? []
      : [{ label: 'value', value: renderValue(payload) }];
  }
  const fields: InspectorField[] = [];
  for (const [label, value] of Object.entries(payload as Record<string, unknown>)) {
    fields.push({ label, value: renderValue(value) });
  }
  return fields;
}

/**
 * Derives a human-readable title for the inspector header from the event type
 * and the most identifying field in its payload (tool name, file path, command,
 * etc.).
 */
function titleFor(event: AgentEvent): string {
  const payload = event.payload;
  switch (event.type) {
    case 'tool_call': {
      const name =
        readOptionalString(payload, 'toolName') ??
        readOptionalString(payload, 'name');
      return name !== undefined ? `Tool call: ${name}` : 'Tool call';
    }
    case 'tool_result': {
      const name = readOptionalString(payload, 'toolName');
      return name !== undefined ? `Tool result: ${name}` : 'Tool result';
    }
    case 'command_run': {
      const command = readOptionalString(payload, 'command');
      return command !== undefined ? `Command: ${command}` : 'Command';
    }
    case 'file_read':
    case 'file_create':
    case 'file_delete':
    case 'file_edit': {
      const path = readOptionalString(payload, 'path');
      return path !== undefined ? `File: ${path}` : 'File';
    }
    default:
      return event.type;
  }
}

/**
 * Builds the normalized inspector model for a single event. The returned `raw`
 * field is the exact source event, untouched, so the inspector drill-down can
 * always reveal the precise data a provider emitted (sacred rule 2).
 */
export function inspectorModel(event: AgentEvent): InspectorModel {
  return {
    title: titleFor(event),
    fields: fieldsFromPayload(event.payload),
    raw: event,
  };
}
