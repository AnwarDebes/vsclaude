import { describe, it, expect } from 'vitest';
import { createAgentEvent } from '@vsclaude/contracts';
import type { AgentEvent, AgentEventType } from '@vsclaude/contracts';
import { buildTimeline } from '../timeline.js';
import { groupIntoTurns } from '../turns.js';
import { inspectorModel } from '../inspector.js';
import type { ToolCallTimelineItem, PlanTimelineItem } from '../types.js';

let seq = 0;

/** Build a real AgentEvent via the contracts factory with an explicit timestamp. */
function makeEvent(type: AgentEventType, payload: Record<string, unknown>, ts: number): AgentEvent {
  seq += 1;
  return createAgentEvent({
    id: `e-${seq}`,
    sessionId: 's1',
    agentId: 'root',
    ts,
    type,
    provider: 'claude-code',
    payload,
  });
}

describe('buildTimeline', () => {
  it('collapses a tool_call and its tool_result into a single item', () => {
    const events: AgentEvent[] = [
      makeEvent('tool_call', { toolUseId: 'tu-1', name: 'Read', input: { path: 'a.ts' } }, 100),
      makeEvent('tool_result', { toolUseId: 'tu-1', isError: false, output: 'file contents' }, 200),
    ];

    const timeline = buildTimeline(events);

    expect(timeline).toHaveLength(1);
    const item = timeline[0] as ToolCallTimelineItem;
    expect(item.kind).toBe('toolCall');
    expect(item.toolUseId).toBe('tu-1');
    expect(item.toolName).toBe('Read');
    expect(item.result).toBeDefined();
    expect(item.status).toBe('ok');
  });

  it('marks a tool call without a result as pending', () => {
    const events: AgentEvent[] = [
      makeEvent('tool_call', { toolUseId: 'tu-2', name: 'Grep', input: {} }, 100),
    ];

    const timeline = buildTimeline(events);
    const item = timeline[0] as ToolCallTimelineItem;

    expect(item.result).toBeUndefined();
    expect(item.status).toBe('pending');
  });

  it('flags an errored tool result', () => {
    const events: AgentEvent[] = [
      makeEvent('tool_call', { toolUseId: 'tu-3', name: 'Bash', input: {} }, 100),
      makeEvent('tool_result', { toolUseId: 'tu-3', isError: true, output: 'boom' }, 150),
    ];

    const item = buildTimeline(events)[0] as ToolCallTimelineItem;
    expect(item.status).toBe('error');
  });

  it('turns a todo_update event into a plan item', () => {
    const events: AgentEvent[] = [
      makeEvent(
        'todo_update',
        {
          todos: [
            { id: 't1', text: 'write code', status: 'in_progress' },
            { id: 't2', text: 'write tests', status: 'pending' },
          ],
        },
        100,
      ),
    ];

    const timeline = buildTimeline(events);
    expect(timeline).toHaveLength(1);
    const item = timeline[0] as PlanTimelineItem;
    expect(item.kind).toBe('plan');
    expect(item.todos).toHaveLength(2);
    expect(item.todos[0]?.text).toBe('write code');
  });

  it('orders items by timestamp regardless of input order', () => {
    const events: AgentEvent[] = [
      makeEvent('message', { role: 'assistant', text: 'second' }, 300),
      makeEvent('message', { role: 'user', text: 'first' }, 100),
    ];

    const timeline = buildTimeline(events);
    expect(timeline[0]?.ts).toBe(100);
    expect(timeline[1]?.ts).toBe(300);
  });
});

describe('groupIntoTurns', () => {
  it('splits a user message and the assistant response into two turns', () => {
    const events: AgentEvent[] = [
      makeEvent('message', { role: 'user', text: 'hi' }, 100),
      makeEvent('thinking', { text: 'planning' }, 200),
      makeEvent('message', { role: 'assistant', text: 'hello' }, 300),
    ];

    const turns = groupIntoTurns(buildTimeline(events));

    expect(turns).toHaveLength(2);
    expect(turns[0]?.role).toBe('user');
    expect(turns[0]?.items).toHaveLength(1);
    expect(turns[1]?.role).toBe('assistant');
    expect(turns[1]?.items).toHaveLength(2);
  });

  it('preserves the full item sequence across turn boundaries', () => {
    const events: AgentEvent[] = [
      makeEvent('message', { role: 'user', text: 'hi' }, 100),
      makeEvent('message', { role: 'assistant', text: 'hello' }, 200),
    ];
    const timeline = buildTimeline(events);
    const turns = groupIntoTurns(timeline);
    const flattened = turns.flatMap((turn) => turn.items);

    expect(flattened).toHaveLength(timeline.length);
    expect(flattened[0]).toBe(timeline[0]);
    expect(flattened[1]).toBe(timeline[1]);
  });
});

describe('inspectorModel', () => {
  it('preserves the raw event and exposes payload fields', () => {
    const event = makeEvent(
      'tool_call',
      { toolUseId: 'tu-9', name: 'Read', input: { path: 'x.ts' } },
      100,
    );

    const model = inspectorModel(event);

    expect(model.raw).toBe(event);
    expect(model.title).toContain('Read');
    const labels = model.fields.map((field) => field.label);
    expect(labels).toContain('toolUseId');
    expect(labels).toContain('name');
  });

  it('serializes nested payload values into a single line', () => {
    const event = makeEvent(
      'tool_call',
      { toolUseId: 'tu-10', name: 'Edit', input: { a: 1, b: [2, 3] } },
      100,
    );

    const model = inspectorModel(event);
    const inputField = model.fields.find((field) => field.label === 'input');
    expect(inputField?.value).toBe(JSON.stringify({ a: 1, b: [2, 3] }));
  });
});
