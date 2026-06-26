import { describe, it, expect } from 'vitest';
import { createAgentEvent, DEFAULT_SETTINGS } from '@vsclaude/contracts';
import type { AgentEvent, PersistedSession } from '@vsclaude/contracts';

import {
  serializeSession,
  parseSession,
  validateSession,
  mergeSettings,
  loadSettings,
  InMemorySecretStore,
  PersistenceError,
} from '../index.js';

/**
 * Build a small but realistic session: a session lifecycle start, a
 * thinking event, and a message. We rely on `createAgentEvent` from the
 * frozen contracts package so every event satisfies `isAgentEvent`.
 */
function makeSession(): PersistedSession {
  const base = { sessionId: 'session-1', agentId: 'root', provider: 'claude-code' as const };
  const started: AgentEvent = createAgentEvent({
    id: 'e1',
    ...base,
    ts: 1,
    type: 'session_start',
    payload: { cwd: '/repo' },
  });
  const thinking: AgentEvent = createAgentEvent({
    id: 'e2',
    ...base,
    ts: 2,
    type: 'thinking',
    payload: { text: 'Considering the request.' },
  });
  const message: AgentEvent = createAgentEvent({
    id: 'e3',
    ...base,
    ts: 3,
    type: 'message',
    payload: { text: 'Hello from the agent.' },
  });

  const events = [started, thinking, message];

  return {
    meta: {
      id: 'session-1',
      name: 'Test run',
      provider: 'claude-code',
      cwd: '/repo',
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_100,
    },
    events,
    checkpoints: [],
  };
}

describe('session serialization', () => {
  it('round-trips a session through serialize and parse', () => {
    const session = makeSession();
    const json = serializeSession(session);
    const parsed = parseSession(json);

    expect(parsed.meta.id).toBe('session-1');
    expect(parsed.events).toHaveLength(3);
    // The event type of the first event survives the round trip.
    expect(parsed.events[0]?.type).toBe('session_start');
    // The full structure is deep-equal to the original.
    expect(parsed).toEqual(session);
  });

  it('validateSession accepts a well-formed session', () => {
    const session = makeSession();
    const checked = validateSession(session);
    expect(checked.events).toHaveLength(session.events.length);
  });

  it('throws PersistenceError on invalid JSON', () => {
    expect(() => parseSession('{ not valid json')).toThrow(PersistenceError);
  });

  it('throws when an event fails contract validation', () => {
    const broken = JSON.stringify({
      meta: {
        id: 's',
        name: 'n',
        provider: 'claude-code',
        cwd: '/r',
        createdAt: 1,
        updatedAt: 1,
      },
      events: [{ not: 'an event' }],
      checkpoints: [],
    });
    expect(() => parseSession(broken)).toThrow(/events\[0\]/);
  });

  it('throws when a checkpoint eventIndex is out of range', () => {
    const session = makeSession();
    const json = serializeSession({
      ...session,
      checkpoints: [
        {
          id: 'cp-1',
          sessionId: 'session-1',
          label: 'checkpoint',
          createdAt: 1,
          eventIndex: 99,
          snapshotRef: 'snap-1',
        },
      ],
    });
    expect(() => parseSession(json)).toThrow(/out of range/);
  });
});

describe('settings merge', () => {
  it('returns defaults when no override is given', () => {
    const merged = mergeSettings();
    expect(merged).toEqual(DEFAULT_SETTINGS);
  });

  it('migrates a legacy boolean editor.wordWrap to the string enum', () => {
    // Older documents stored wordWrap as a boolean; the current schema is an enum.
    expect(mergeSettings({ editor: { wordWrap: true } } as never).editor.wordWrap).toBe('on');
    expect(mergeSettings({ editor: { wordWrap: false } } as never).editor.wordWrap).toBe('off');
    // A current string value passes through untouched.
    expect(mergeSettings({ editor: { wordWrap: 'bounded' } } as never).editor.wordWrap).toBe(
      'bounded',
    );
  });

  it('fills defaults while keeping explicit overrides', () => {
    const defaultKeys = Object.keys(
      DEFAULT_SETTINGS as unknown as Record<string, unknown>,
    );
    expect(defaultKeys.length).toBeGreaterThan(0);

    // Pick the first top-level key that holds a nested object so we can
    // verify deep merge without hard-coding a field name the contract
    // may rename later.
    const baseRecord = DEFAULT_SETTINGS as unknown as Record<string, unknown>;
    const nestedKey = defaultKeys.find((key) => {
      const value = baseRecord[key];
      return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      );
    });

    if (nestedKey !== undefined) {
      const nestedObject = baseRecord[nestedKey] as Record<string, unknown>;
      const innerKeys = Object.keys(nestedObject);
      const override = {
        [nestedKey]: { [`__probe_${nestedKey}`]: 'overridden' },
      } as never;

      const merged = mergeSettings(override) as unknown as Record<
        string,
        unknown
      >;
      const mergedNested = merged[nestedKey] as Record<string, unknown>;

      // The probe override is present.
      expect(mergedNested[`__probe_${nestedKey}`]).toBe('overridden');
      // The original nested keys are still present (deep merge, not
      // wholesale replace).
      for (const innerKey of innerKeys) {
        expect(innerKey in mergedNested).toBe(true);
      }
    } else {
      // No nested object in defaults: still verify a top-level override
      // takes effect and does not drop other keys.
      const merged = mergeSettings({ __probe_top: 'x' } as never) as Record<
        string,
        unknown
      >;
      expect(merged['__probe_top']).toBe('x');
      for (const key of defaultKeys) {
        expect(key in merged).toBe(true);
      }
    }
  });

  it('does not mutate the frozen defaults', () => {
    const before = JSON.stringify(DEFAULT_SETTINGS);
    mergeSettings({ __probe: { nested: true } } as never);
    const after = JSON.stringify(DEFAULT_SETTINGS);
    expect(after).toBe(before);
  });

  it('loadSettings falls back to defaults on corrupt JSON', () => {
    const loaded = loadSettings('}{ broken');
    expect(loaded).toEqual(DEFAULT_SETTINGS);
  });
});

describe('InMemorySecretStore', () => {
  it('supports set, get, and delete', async () => {
    const store = new InMemorySecretStore();

    expect(await store.get('provider:anthropic:apiKey')).toBeUndefined();

    await store.set('provider:anthropic:apiKey', 'sk-test-123');
    expect(await store.get('provider:anthropic:apiKey')).toBe('sk-test-123');
    expect(store.has('provider:anthropic:apiKey')).toBe(true);
    expect(store.size).toBe(1);

    // Overwrite replaces the prior value.
    await store.set('provider:anthropic:apiKey', 'sk-test-456');
    expect(await store.get('provider:anthropic:apiKey')).toBe('sk-test-456');

    const removed = await store.delete('provider:anthropic:apiKey');
    expect(removed).toBe(true);
    expect(await store.get('provider:anthropic:apiKey')).toBeUndefined();

    // Deleting a missing key reports false.
    expect(await store.delete('provider:anthropic:apiKey')).toBe(false);
  });

  it('seeds initial entries and rejects empty keys', async () => {
    const store = new InMemorySecretStore({ 'k': 'v' });
    expect(await store.get('k')).toBe('v');
    await expect(store.set('', 'x')).rejects.toThrow();
  });
});
