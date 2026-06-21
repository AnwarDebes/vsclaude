import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AgentEvent, AgentTree, MotionDirective } from '@vsclaude/contracts';
import { REST_DIRECTIVE } from '@vsclaude/contracts';
import { classifyAction, mapEvents } from '@vsclaude/motion';
import { reduceAgentTree } from '@vsclaude/agent-runtime';
import { buildTimeline } from '@vsclaude/chat';
import { computeRoster, delegationEdges, aggregateTokens } from '@vsclaude/swarm';
import { captionFor } from '../lib/motion-lite';
import { demoSession } from './demo-session';

const STEP_MS = 1500;

export interface SessionState {
  events: AgentEvent[];
  current?: AgentEvent;
  directive: MotionDirective;
  actionId: string;
  tree: AgentTree;
  roster: ReturnType<typeof computeRoster>;
  edges: ReturnType<typeof delegationEdges>;
  tokens: ReturnType<typeof aggregateTokens>;
  timeline: ReturnType<typeof buildTimeline>;
  /** Latest resolved action id per agent, for the swarm view. */
  actionByAgent: Record<string, string>;
  /** Recent plain-language captions, newest last, for the narrated stream. */
  narration: string[];
  index: number;
  total: number;
  playing: boolean;
  setPlaying: (playing: boolean) => void;
  restart: () => void;
  stepTo: (index: number) => void;
}

/**
 * The integration hub. It replays the demo session and derives everything the
 * panels render by running the real packages: the motion mapper (Pixie), the
 * agent runtime (the delegation tree), the chat builder (the timeline), and the
 * swarm helpers (roster, edges, token totals). Connecting a provider swaps the
 * event source and nothing else changes.
 */
export function useSession(
  events: AgentEvent[] = demoSession,
  options: { live?: boolean } = {},
): SessionState {
  const live = options.live ?? false;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  // In live mode the events stream in from a real provider, so always show the
  // newest one instead of replaying on a timer.
  useEffect(() => {
    if (live) setIndex(Math.max(0, events.length - 1));
  }, [live, events.length]);

  const seen = useMemo(() => events.slice(0, index + 1), [events, index]);
  const current = seen[seen.length - 1];

  const directive = useMemo<MotionDirective>(() => {
    if (seen.length === 0) return REST_DIRECTIVE;
    const directives = mapEvents(seen, (e) => e.ts);
    return directives[directives.length - 1] ?? REST_DIRECTIVE;
  }, [seen]);

  const tree = useMemo(() => reduceAgentTree(seen), [seen]);
  const roster = useMemo(() => computeRoster(tree), [tree]);
  const edges = useMemo(() => delegationEdges(tree), [tree]);
  const tokens = useMemo(() => aggregateTokens(tree), [tree]);
  const timeline = useMemo(() => buildTimeline(seen), [seen]);

  const actionByAgent = useMemo(() => {
    const latest: Record<string, AgentEvent> = {};
    for (const event of seen) {
      latest[event.agentId] = event;
    }
    const out: Record<string, string> = {};
    for (const [agentId, event] of Object.entries(latest)) {
      out[agentId] = classifyAction(event);
    }
    return out;
  }, [seen]);

  const narration = useMemo(
    () =>
      seen
        .slice(-6)
        .map((e) => captionFor(e))
        .filter((c): c is string => Boolean(c)),
    [seen],
  );

  useEffect(() => {
    if (live || !playing) return;
    if (index >= events.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setIndex((i) => Math.min(i + 1, events.length - 1)), STEP_MS);
    return () => clearTimeout(timer);
  }, [live, playing, index, events.length]);

  const restart = useCallback(() => {
    setIndex(0);
    setPlaying(true);
  }, []);

  const stepTo = useCallback(
    (next: number) => {
      setPlaying(false);
      setIndex(Math.max(0, Math.min(next, events.length - 1)));
    },
    [events.length],
  );

  return {
    events: seen,
    current,
    directive,
    actionId: directive.actionId ?? 'rest',
    tree,
    roster,
    edges,
    tokens,
    timeline,
    actionByAgent,
    narration,
    index,
    total: events.length,
    playing,
    setPlaying,
    restart,
    stepTo,
  };
}
