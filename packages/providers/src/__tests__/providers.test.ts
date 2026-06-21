import { describe, it, expect } from 'vitest';

import type { ProviderAdapter, AgentEvent } from '@vsclaude/contracts';

import {
  ProviderRegistry,
  createProviderRegistry,
  DuplicateProviderError,
  parseClaudeStreamLine,
  createCounter,
  makeEventId,
  type ClaudeParseContext,
} from '../index.js';

/** Builds a fresh parse context for each test so counters never leak. */
function makeCtx(): ClaudeParseContext {
  return {
    sessionId: 'sess-1',
    agentId: 'agent-root',
    provider: 'claude-code',
    counter: createCounter(),
  };
}

/** Builds a minimal fake adapter for registry tests. */
function fakeAdapter(id: ProviderAdapter['id']): ProviderAdapter {
  return {
    id,
    name: `Fake ${id}`,
    capabilities: {},
    async open() {
      throw new Error('not implemented in test');
    },
  } as unknown as ProviderAdapter;
}

describe('ids helpers', () => {
  it('produces ordered, padded, deterministic event ids', () => {
    const counter = createCounter();
    expect(makeEventId('s', counter.next())).toBe('evt-s-000000');
    expect(makeEventId('s', counter.next())).toBe('evt-s-000001');
    expect(counter.peek()).toBe(2);
  });
});

describe('ProviderRegistry', () => {
  it('registers, looks up, lists, and reports membership', () => {
    const registry = createProviderRegistry();
    const adapter = fakeAdapter('claude-code');

    registry.register(adapter);

    expect(registry.has('claude-code')).toBe(true);
    expect(registry.get('claude-code')).toBe(adapter);
    expect(registry.list()).toHaveLength(1);
    expect(registry.size).toBe(1);
  });

  it('throws on duplicate registration but allows upsert', () => {
    const registry = new ProviderRegistry();
    registry.register(fakeAdapter('claude-code'));

    expect(() => registry.register(fakeAdapter('claude-code'))).toThrow(
      DuplicateProviderError,
    );

    const replacement = fakeAdapter('claude-code');
    const previous = registry.upsert(replacement);
    expect(previous).toBeDefined();
    expect(registry.get('claude-code')).toBe(replacement);
  });

  it('unregisters adapters', () => {
    const registry = new ProviderRegistry();
    registry.register(fakeAdapter('mock'));
    expect(registry.unregister('mock')).toBe(true);
    expect(registry.has('mock')).toBe(false);
    expect(registry.unregister('mock')).toBe(false);
  });
});

describe('parseClaudeStreamLine', () => {
  it('maps an Edit tool_use to a file_edit event carrying the path', () => {
    const line = JSON.stringify({
      type: 'assistant',
      message: {
        content: [
          {
            type: 'tool_use',
            id: 'toolu_01',
            name: 'Edit',
            input: { file_path: '/repo/src/app.ts', old_string: 'a', new_string: 'b' },
          },
        ],
      },
    });

    const event = parseClaudeStreamLine(line, makeCtx());
    expect(event).not.toBeNull();
    const evt = event as AgentEvent;
    expect(evt.type).toBe('file_edit');
    const payload = evt.payload as { path: string };
    expect(payload.path).toBe('/repo/src/app.ts');
    expect(evt.caption).toBe('Editing app.ts');
    expect(evt.raw).not.toBeUndefined();
  });

  it('maps a Write tool_use to file_create and Bash to command_run', () => {
    const writeLine = JSON.stringify({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', id: 't1', name: 'Write', input: { file_path: '/a/b.txt' } }],
      },
    });
    const bashLine = JSON.stringify({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', id: 't2', name: 'Bash', input: { command: 'ls -la' } }],
      },
    });

    const write = parseClaudeStreamLine(writeLine, makeCtx());
    const bash = parseClaudeStreamLine(bashLine, makeCtx());

    expect(write?.type).toBe('file_create');
    expect((write?.payload as { path: string }).path).toBe('/a/b.txt');
    expect(bash?.type).toBe('command_run');
    expect((bash?.payload as { command: string }).command).toBe('ls -la');
  });

  it('maps a Grep tool_use to a search event', () => {
    const line = JSON.stringify({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', id: 't3', name: 'Grep', input: { pattern: 'TODO' } }],
      },
    });
    const event = parseClaudeStreamLine(line, makeCtx());
    expect(event?.type).toBe('search');
    expect((event?.payload as { query: string }).query).toBe('TODO');
  });

  it('maps a Task tool_use to subagent_spawned', () => {
    const line = JSON.stringify({
      type: 'assistant',
      message: {
        content: [
          {
            type: 'tool_use',
            id: 'toolu_task',
            name: 'Task',
            input: { description: 'Audit the auth flow', prompt: 'Look at login.ts' },
          },
        ],
      },
    });

    const event = parseClaudeStreamLine(line, makeCtx());
    expect(event?.type).toBe('subagent_spawned');
    const payload = event?.payload as { childAgentId: string; task: string };
    expect(payload.childAgentId).toBe('toolu_task');
    expect(payload.task).toBe('Audit the auth flow');
  });

  it('maps assistant text to message and thinking blocks to thinking', () => {
    const textLine = JSON.stringify({
      type: 'assistant',
      message: { content: [{ type: 'text', text: 'Hello trader' }] },
    });
    const thinkLine = JSON.stringify({
      type: 'assistant',
      message: { content: [{ type: 'thinking', thinking: 'Let me plan this' }] },
    });

    expect(parseClaudeStreamLine(textLine, makeCtx())?.type).toBe('message');
    expect(parseClaudeStreamLine(thinkLine, makeCtx())?.type).toBe('thinking');
  });

  it('maps a tool_result on a user line to tool_result', () => {
    const line = JSON.stringify({
      type: 'user',
      message: {
        content: [
          { type: 'tool_result', tool_use_id: 'toolu_01', content: 'done', is_error: false },
        ],
      },
    });
    const event = parseClaudeStreamLine(line, makeCtx());
    expect(event?.type).toBe('tool_result');
    expect((event?.payload as { isError: boolean }).isError).toBe(false);
  });

  it('maps a final result line to a complete event', () => {
    const line = JSON.stringify({
      type: 'result',
      subtype: 'success',
      is_error: false,
      result: 'All done',
    });
    const event = parseClaudeStreamLine(line, makeCtx());
    expect(event?.type).toBe('complete');
    expect((event?.payload as { summary: string }).summary).toBe('All done');
  });

  it('returns null for malformed, blank, and unrecognized lines', () => {
    const ctx = makeCtx();
    expect(parseClaudeStreamLine('{ not json', ctx)).toBeNull();
    expect(parseClaudeStreamLine('   ', ctx)).toBeNull();
    expect(parseClaudeStreamLine('42', ctx)).toBeNull();
    expect(parseClaudeStreamLine(JSON.stringify({ type: 'system' }), ctx)).toBeNull();
  });
});
