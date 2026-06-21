import { describe, it, expect } from 'vitest';
import { createAgentEvent } from '@vsclaude/contracts';
import type { AgentEvent } from '@vsclaude/contracts';
import {
  Mapper,
  mapEvents,
  captionFor,
  intensityFor,
  moodFor,
  basename,
  truncate,
  clamp01,
  stateForEvent,
  REST_DIRECTIVE,
} from '../index.js';

/**
 * Helper that builds a real AgentEvent through the contracts factory. We pass a
 * minimal input and rely on createAgentEvent to fill the envelope (id, ts).
 */
function makeEvent(
  type: AgentEvent['type'],
  payload: Record<string, unknown> = {},
): AgentEvent {
  return createAgentEvent({ type, payload } as never);
}

describe('captionFor', () => {
  it('names the file being read and edited', () => {
    const read = makeEvent('file_read', { path: '/home/me/src/app/index.ts' });
    expect(captionFor(read)).toBe('Reading index.ts.');

    const edit = makeEvent('file_edit', { path: 'C:\\repo\\components\\Pixie.tsx' });
    expect(captionFor(edit)).toBe('Editing Pixie.tsx.');
  });

  it('quotes the search query and asks for permission politely', () => {
    const search = makeEvent('search', { query: 'mapEvents' });
    expect(captionFor(search)).toBe("Searching for 'mapEvents'.");

    const perm = makeEvent('permission_request', { reason: 'rm files' });
    expect(captionFor(perm)).toBe('Need your OK to run this.');
  });
});

describe('pure helpers', () => {
  it('basename and truncate behave', () => {
    expect(basename('/a/b/c.ts')).toBe('c.ts');
    expect(basename('plain.ts')).toBe('plain.ts');
    expect(basename('/a/b/dir/')).toBe('dir');
    expect(truncate('hello world', 5)).toBe('hell...');
    expect(truncate('short', 50)).toBe('short');
  });

  it('clamp01 keeps values in range', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(Number.NaN)).toBe(0);
  });
});

describe('intensityFor', () => {
  it('is zero for no events and rises with edit churn', () => {
    expect(intensityFor([])).toBe(0);

    const calm = [makeEvent('file_read', { path: 'a.ts' })];
    const busy = [
      makeEvent('file_edit', { path: 'a.ts', addedLines: 40, removedLines: 40 }),
      makeEvent('file_edit', { path: 'b.ts', addedLines: 40, removedLines: 40 }),
      makeEvent('command_run', { command: 'pnpm build' }),
    ];
    expect(intensityFor(busy)).toBeGreaterThan(intensityFor(calm));
    expect(intensityFor(busy)).toBeLessThanOrEqual(1);
  });
});

describe('moodFor', () => {
  it('struggles on repeated errors and excites on completion', () => {
    const errors = [
      makeEvent('error', { message: 'boom' }),
      makeEvent('error', { message: 'boom again' }),
    ];
    expect(moodFor(stateForEvent(errors[1] as AgentEvent), errors)).toBe(
      'struggling',
    );

    const done = [makeEvent('complete', {})];
    expect(moodFor(stateForEvent(done[0] as AgentEvent), done)).toBe('excited');
  });
});

describe('Mapper', () => {
  it('starts at REST_DIRECTIVE', () => {
    const mapper = new Mapper();
    expect(mapper.current()).toBe(REST_DIRECTIVE);
  });

  it('maps a file_edit to typing with a caption naming the file', () => {
    const mapper = new Mapper();
    const edit = makeEvent('file_edit', { path: '/src/Pixie.tsx', addedLines: 3 });
    const directive = mapper.push(edit, 1000);
    expect(directive.state).toBe('typing');
    expect(directive.caption).toBe('Editing Pixie.tsx.');
    expect(directive.sourceEventId).toBe(edit.id);
  });

  it('lets a permission_request override a concurrent file_read', () => {
    const mapper = new Mapper();
    const read = makeEvent('file_read', { path: '/src/a.ts' });
    const first = mapper.push(read, 0);
    expect(first.state).toBe('reading');

    const perm = makeEvent('permission_request', { reason: 'run command' });
    // Arrives well within the dwell window, yet priority must win.
    const second = mapper.push(perm, 100);
    expect(second.state).toBe('waiting');
    expect(second.sourceEventId).toBe(perm.id);
  });

  it('honours minimum dwell time to prevent an immediate flip back', () => {
    const mapper = new Mapper({ minDwellMs: 600 });
    const run = makeEvent('command_run', { command: 'pnpm test' });
    const a = mapper.push(run, 0);
    expect(a.state).toBe('running');

    // A lower priority read arrives only 100ms later: dwell not satisfied, so
    // the running state must hold.
    const read = makeEvent('file_read', { path: '/src/b.ts' });
    const b = mapper.push(read, 100);
    expect(b.state).toBe('running');

    // After the dwell elapses, the ambient read may take over.
    const read2 = makeEvent('file_read', { path: '/src/c.ts' });
    const c = mapper.push(read2, 800);
    expect(c.state).toBe('reading');
  });

  it('moves struggling then excited across an error then success run', () => {
    const mapper = new Mapper();
    mapper.push(makeEvent('error', { message: 'e1' }), 0);
    const afterSecondError = mapper.push(
      makeEvent('error', { message: 'e2' }),
      200,
    );
    expect(afterSecondError.mood).toBe('struggling');

    // Clear the window with calm work, then complete to celebrate.
    mapper.push(makeEvent('file_read', { path: 'x.ts' }), 6000);
    const done = mapper.push(makeEvent('complete', {}), 6100);
    expect(done.mood).toBe('excited');
  });

  it('mapEvents replays a sequence deterministically', () => {
    const events = [
      makeEvent('file_read', { path: 'a.ts' }),
      makeEvent('file_edit', { path: 'b.ts', addedLines: 5 }),
      makeEvent('permission_request', { reason: 'go' }),
    ];
    const out = mapEvents(events, (_e, i) => i * 1000);
    expect(out).toHaveLength(3);
    expect(out[2]?.state).toBe('waiting');
  });
});
