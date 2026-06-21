import { useCallback, useEffect, useRef, useState } from 'react';
import { createAgentEvent, type AgentEvent } from '@vsclaude/contracts';
import { createCounter, parseClaudeStreamLine, type ClaudeParseContext } from '@vsclaude/providers';
import {
  isTauri,
  onProviderExit,
  onProviderStdout,
  providerAvailable,
  providerStart,
} from '../lib/tauri';

export interface LiveProvider {
  /** True when the Claude Code CLI is installed and reachable. */
  available: boolean;
  /** True while a real session is streaming. */
  running: boolean;
  /** The normalized events produced so far by the live session. */
  events: AgentEvent[];
  /** Start a real agent session for the given prompt. */
  start: (prompt: string, cwd?: string) => Promise<void>;
}

/**
 * Drives a real Claude Code session through the native core. The Rust side
 * spawns `claude --output-format stream-json` and forwards each NDJSON line;
 * here we normalize every line with the same `parseClaudeStreamLine` adapter the
 * tests use, so the live stream and the recorded demo produce identical
 * AgentEvents. Outside the native app (or without the CLI) it stays inert and
 * the recorded demo is used instead.
 */
export function useLiveProvider(): LiveProvider {
  const [available, setAvailable] = useState(false);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const unlisten = useRef<Array<() => void>>([]);

  useEffect(() => {
    if (!isTauri()) return;
    providerAvailable()
      .then(setAvailable)
      .catch(() => setAvailable(false));
    const handles = unlisten.current;
    return () => handles.forEach((u) => u());
  }, []);

  const start = useCallback(async (prompt: string, cwd?: string) => {
    if (!isTauri()) return;
    setEvents([]);
    setRunning(true);
    const counter = createCounter();
    const { sessionId } = await providerStart(prompt, cwd ? { cwd } : undefined);
    const ctx: ClaudeParseContext = { sessionId, agentId: 'root', provider: 'claude-code', counter };

    const u1 = await onProviderStdout((p) => {
      if (p.sessionId !== sessionId) return;
      const event = parseClaudeStreamLine(p.line, ctx);
      if (event) setEvents((prev) => [...prev, event]);
    });
    const u2 = await onProviderExit((p) => {
      if (p.sessionId !== sessionId) return;
      setRunning(false);
      setEvents((prev) => [
        ...prev,
        createAgentEvent({
          id: `complete-${prev.length}`,
          sessionId,
          agentId: 'root',
          ts: Date.now(),
          type: p.code && p.code !== 0 ? 'error' : 'complete',
          provider: 'claude-code',
          payload:
            p.code && p.code !== 0
              ? { message: `exited with code ${p.code}` }
              : { summary: 'Session finished' },
        }),
      ]);
    });
    unlisten.current.push(u1, u2);
  }, []);

  return { available, running, events, start };
}
