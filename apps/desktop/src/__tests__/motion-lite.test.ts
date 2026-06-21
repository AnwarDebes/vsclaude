import { describe, it, expect } from 'vitest';
import { createAgentEvent, type AgentEvent } from '@vsclaude/contracts';
import { captionFor, pixieStateFor } from '../lib/motion-lite';
import { demoEvents } from '../demo-events';

function ev(type: AgentEvent['type'], payload: Record<string, unknown>): AgentEvent {
  return createAgentEvent({
    id: 't',
    sessionId: 's',
    agentId: 'root',
    ts: 0,
    type,
    provider: 'claude-code',
    payload,
  });
}

describe('motion-lite', () => {
  it('maps events to the right Pixie state', () => {
    expect(pixieStateFor(ev('file_edit', { path: 'a.ts' }))).toBe('typing');
    expect(pixieStateFor(ev('file_read', { path: 'a.ts' }))).toBe('reading');
    expect(pixieStateFor(ev('permission_request', { requestId: 'r', action: 'run', detail: 'x' }))).toBe(
      'waiting',
    );
    expect(pixieStateFor(ev('complete', {}))).toBe('success');
  });

  it('writes plain-language captions naming the file', () => {
    expect(captionFor(ev('file_read', { path: 'src/auth.ts' }))).toBe('Reading auth.ts.');
    expect(captionFor(ev('search', { query: 'useAuth', kind: 'grep' }))).toBe(
      "Searching for 'useAuth'.",
    );
  });

  it('prefers an explicit caption when present', () => {
    const e = createAgentEvent({
      id: 'x',
      sessionId: 's',
      agentId: 'root',
      ts: 0,
      type: 'complete',
      provider: 'claude-code',
      caption: 'Done! All tests pass.',
    });
    expect(captionFor(e)).toBe('Done! All tests pass.');
  });

  it('ships a non-empty, well-formed demo timeline', () => {
    expect(demoEvents.length).toBeGreaterThan(5);
    expect(demoEvents[0]?.type).toBe('session_start');
    expect(demoEvents.every((e) => typeof e.id === 'string')).toBe(true);
  });
});
