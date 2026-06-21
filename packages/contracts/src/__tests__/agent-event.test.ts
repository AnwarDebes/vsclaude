import { describe, it, expect } from 'vitest';
import {
  AGENT_EVENT_TYPES,
  createAgentEvent,
  isAgentEvent,
  isAgentEventType,
  isWorkerEvent,
} from '../agent-event.js';
import { AGENT_EVENT_SCHEMA_VERSION } from '../version.js';
import { EVENT_TO_STATE, PIXIE_STATES } from '../motion.js';
import { THEMES, DEFAULT_THEME_ID, colorVar, tokensForTheme } from '../design-tokens.js';
import { isPluginCompatible, PLUGIN_API_VERSION } from '../plugin-api.js';
import { DEFAULT_SETTINGS } from '../state.js';

describe('createAgentEvent', () => {
  it('stamps the current schema version', () => {
    const e = createAgentEvent({
      id: 'e1',
      sessionId: 's1',
      agentId: 'a1',
      ts: 1000,
      type: 'file_read',
      provider: 'claude-code',
      payload: { path: 'src/auth.ts' },
    });
    expect(e.schemaVersion).toBe(AGENT_EVENT_SCHEMA_VERSION);
    expect(e.type).toBe('file_read');
  });

  it('respects an explicit schema version', () => {
    const e = createAgentEvent({
      id: 'e2',
      sessionId: 's1',
      agentId: 'a1',
      ts: 1,
      type: 'complete',
      provider: 'codex',
      schemaVersion: 99,
    });
    expect(e.schemaVersion).toBe(99);
  });
});

describe('type guards', () => {
  it('isAgentEventType accepts known types and rejects unknown', () => {
    expect(isAgentEventType('thinking')).toBe(true);
    expect(isAgentEventType('not_a_type')).toBe(false);
  });

  it('isAgentEvent validates structure', () => {
    const good = createAgentEvent({
      id: 'e',
      sessionId: 's',
      agentId: 'a',
      ts: 0,
      type: 'message',
      provider: 'gemini',
    });
    expect(isAgentEvent(good)).toBe(true);
    expect(isAgentEvent(null)).toBe(false);
    expect(isAgentEvent({ id: 'x' })).toBe(false);
    expect(isAgentEvent({ ...good, type: 'bogus' })).toBe(false);
  });

  it('isWorkerEvent detects delegated workers', () => {
    const root = createAgentEvent({
      id: 'r',
      sessionId: 's',
      agentId: 'root',
      ts: 0,
      type: 'thinking',
      provider: 'claude-code',
    });
    const worker = createAgentEvent({
      id: 'w',
      sessionId: 's',
      agentId: 'worker-1',
      parentAgentId: 'root',
      ts: 0,
      type: 'typing' as never,
      provider: 'claude-code',
    });
    expect(isWorkerEvent(root)).toBe(false);
    expect(isWorkerEvent(worker)).toBe(true);
  });
});

describe('motion mapping table', () => {
  it('every mapped state is a real Pixie state', () => {
    for (const state of Object.values(EVENT_TO_STATE)) {
      expect(PIXIE_STATES).toContain(state);
    }
  });

  it('permission_request maps to waiting and complete to success', () => {
    expect(EVENT_TO_STATE.permission_request).toBe('waiting');
    expect(EVENT_TO_STATE.complete).toBe('success');
  });

  it('only maps known event types (sacred rule 1)', () => {
    for (const key of Object.keys(EVENT_TO_STATE)) {
      expect(AGENT_EVENT_TYPES).toContain(key);
    }
  });
});

describe('design tokens', () => {
  it('ships the default theme', () => {
    expect(THEMES[DEFAULT_THEME_ID]).toBeDefined();
  });

  it('derives CSS variable names', () => {
    expect(colorVar('accent')).toBe('--color-accent');
    expect(colorVar('surfaceElevated')).toBe('--color-surface-elevated');
  });

  it('builds a full token set for a theme', () => {
    const theme = THEMES[DEFAULT_THEME_ID];
    expect(theme).toBeDefined();
    const tokens = tokensForTheme(theme!);
    expect(tokens.color.accent).toBe(theme!.color.accent);
    expect(tokens.space.md).toBeTruthy();
  });
});

describe('plugin compatibility', () => {
  it('accepts a matching api version', () => {
    expect(
      isPluginCompatible({
        id: 'p',
        name: 'P',
        version: '1.0.0',
        apiVersion: PLUGIN_API_VERSION,
      }),
    ).toBe(true);
  });

  it('rejects a mismatched api version', () => {
    expect(
      isPluginCompatible({
        id: 'p',
        name: 'P',
        version: '1.0.0',
        apiVersion: PLUGIN_API_VERSION + 1,
      }),
    ).toBe(false);
  });
});

describe('default settings', () => {
  it('keep sound off and telemetry off by default', () => {
    expect(DEFAULT_SETTINGS.sound.enabled).toBe(false);
    expect(DEFAULT_SETTINGS.telemetry).toBe(false);
    expect(DEFAULT_SETTINGS.defaultProvider).toBe('claude-code');
  });
});
