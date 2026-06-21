import { useCallback, useEffect, useMemo, useState } from 'react';
import { REST_DIRECTIVE, type MotionDirective } from '@vsclaude/contracts';
import { classifyAction } from '@vsclaude/motion';
import { demoEvents } from './demo-events';
import { captionFor, pixieStateFor } from './lib/motion-lite';
import { PixieStage } from './components/PixieStage';
import { PixieActionSprite } from './components/ActionIcon';
import { ActivityFeed } from './components/ActivityFeed';

const STATE_LABELS: Record<string, string> = {
  idle: 'resting',
  greeting: 'saying hello',
  thinking: 'thinking',
  planning: 'planning the work',
  reading: 'reading files',
  searching: 'searching',
  web: 'checking the web',
  typing: 'writing code',
  running: 'running a command',
  building: 'building',
  debugging: 'debugging',
  git: 'saving to git',
  spawning: 'calling a helper',
  waiting: 'waiting for you',
  success: 'celebrating',
  confused: 'puzzled',
  sleeping: 'resting',
};

const STEP_MS = 1600;

/**
 * The first-run shell. It plays the scripted demo timeline so a new user
 * immediately sees the core promise: a real event stream driving Pixie, with
 * the readable truth one click away. Connecting a provider swaps the demo feed
 * for a live one and nothing else changes.
 */
export function App() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  const seen = useMemo(() => demoEvents.slice(0, index + 1), [index]);
  const current = seen[seen.length - 1];

  const directive: MotionDirective = useMemo(() => {
    if (!current) return REST_DIRECTIVE;
    return {
      state: pixieStateFor(current),
      mood: 'focused',
      intensity: 0.6,
      gaze: { x: 0, y: 0 },
      caption: captionFor(current),
      sourceEventId: current.id,
      actionId: classifyAction(current),
    };
  }, [current]);

  const actionId = directive.actionId ?? 'rest';

  useEffect(() => {
    if (!playing) return;
    if (index >= demoEvents.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setIndex((i) => Math.min(i + 1, demoEvents.length - 1)), STEP_MS);
    return () => clearTimeout(timer);
  }, [playing, index]);

  const restart = useCallback(() => {
    setIndex(0);
    setPlaying(true);
  }, []);

  const stateLabel = STATE_LABELS[directive.state] ?? directive.state;

  return (
    <div className="app-shell">
      <PixieActionSprite />
      <header className="app-header">
        <div className="app-brand">
          <span className="app-brand__glyph" aria-hidden>
            {'>_'}
          </span>
          <span className="app-brand__name">vsclaude</span>
          <span className="app-brand__tag">Claude Code, in motion</span>
        </div>
        <div className="app-header__controls">
          <button type="button" onClick={() => setPlaying((p) => !p)} className="btn">
            {playing ? 'Pause' : 'Play'}
          </button>
          <button type="button" onClick={restart} className="btn btn--ghost">
            Replay
          </button>
        </div>
      </header>

      <main className="app-main">
        <PixieStage actionId={actionId} caption={directive.caption} stateLabel={stateLabel} />
        <ActivityFeed events={seen} />
      </main>

      <footer className="app-footer">
        <span>
          Demo session, {seen.length} of {demoEvents.length} events. This is placeholder data so you
          can meet Pixie. Connect a provider to watch a real run.
        </span>
      </footer>
    </div>
  );
}
