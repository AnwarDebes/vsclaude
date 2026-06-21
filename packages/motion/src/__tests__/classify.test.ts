import { describe, it, expect } from 'vitest';
import { createAgentEvent, isActionId, type AgentEvent } from '@vsclaude/contracts';
import { classifyAction } from '../classify.js';
import { Mapper } from '../mapper.js';

let seq = 0;
function ev(type: AgentEvent['type'], payload: Record<string, unknown>, tool?: AgentEvent['tool']): AgentEvent {
  seq += 1;
  return createAgentEvent({
    id: `c-${seq}`,
    sessionId: 's',
    agentId: 'root',
    ts: seq,
    type,
    provider: 'claude-code',
    payload,
    ...(tool ? { tool } : {}),
  });
}

describe('classifyAction', () => {
  it('resolves git operations to the specific action', () => {
    expect(classifyAction(ev('git_action', { action: 'commit' }))).toBe('commit');
    expect(classifyAction(ev('git_action', { action: 'push' }))).toBe('push');
    expect(classifyAction(ev('git_action', { action: 'rebase' }))).toBe('rebase');
    expect(classifyAction(ev('git_action', { action: 'unknown-kind' }))).toBe('git');
  });

  it('resolves commands by keyword', () => {
    expect(classifyAction(ev('command_run', { command: 'pnpm test login' }))).toBe('test');
    expect(classifyAction(ev('command_run', { command: 'pnpm build' }))).toBe('build');
    expect(classifyAction(ev('command_run', { command: 'pnpm add zod' }))).toBe('install');
    expect(classifyAction(ev('command_run', { command: 'echo hi' }))).toBe('run');
  });

  it('resolves tool calls by tool name', () => {
    expect(classifyAction(ev('tool_call', {}, { name: 'Read', input: {} }))).toBe('read');
    expect(classifyAction(ev('tool_call', {}, { name: 'Grep', input: {} }))).toBe('search');
    expect(classifyAction(ev('tool_call', {}, { name: 'UnknownTool', input: {} }))).toBe('tool');
  });

  it('falls back to a valid action per event type', () => {
    expect(classifyAction(ev('file_read', { path: 'a.ts' }))).toBe('read');
    expect(classifyAction(ev('complete', {}))).toBe('done');
    expect(classifyAction(ev('error', { message: 'x' }))).toBe('stuck');
    expect(isActionId(classifyAction(ev('token_usage', { inputTokens: 1, outputTokens: 1 })))).toBe(
      true,
    );
  });

  it('the mapper stamps the actionId on its directive', () => {
    const mapper = new Mapper();
    const directive = mapper.push(ev('git_action', { action: 'commit' }), 1000);
    expect(directive.actionId).toBe('commit');
    expect(directive.state).toBe('git');
  });
});
