import { useMemo, useState, useSyncExternalStore } from 'react';
import {
  clearLog,
  DEFAULT_CHANNEL,
  filterLog,
  filterLogByChannel,
  getLog,
  logChannels,
  subscribeLog,
  type LogLevel,
} from '../lib/output-log';

export interface OutputPanelProps {
  onClose: () => void;
}

const LEVELS: Array<{ value: LogLevel | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'info', label: 'Info' },
  { value: 'warn', label: 'Warnings' },
  { value: 'error', label: 'Errors' },
];

/**
 * The Output panel: a read-only view of the vsclaude log channel (startup,
 * opening a folder, running a task, errors), filterable by level.
 */
export function OutputPanel({ onClose }: OutputPanelProps) {
  const entries = useSyncExternalStore(subscribeLog, getLog, getLog);
  const [level, setLevel] = useState<LogLevel | 'all'>('all');
  const [channel, setChannel] = useState<string>(DEFAULT_CHANNEL);
  const channels = useMemo(() => {
    const found = logChannels(entries);
    return found.length > 0 ? found : [DEFAULT_CHANNEL];
  }, [entries]);
  const active = channels.includes(channel) ? channel : channels[0] ?? DEFAULT_CHANNEL;
  const visible = filterLog(filterLogByChannel(entries, active), level);

  return (
    <section className="output" role="region" aria-label="Output">
      <header className="output__header">
        <h2 className="output__title">Output</h2>
        <select
          className="output__filter"
          aria-label="Output channel"
          value={active}
          onChange={(e) => setChannel(e.target.value)}
        >
          {channels.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="output__filter"
          aria-label="Filter by level"
          value={level}
          onChange={(e) => setLevel(e.target.value as LogLevel | 'all')}
        >
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <button type="button" className="output__action" onClick={() => clearLog()}>
          Clear
        </button>
        <button type="button" className="btn btn--ghost output__close" aria-label="Close Output panel" onClick={onClose}>
          Close
        </button>
      </header>
      <div className="output__body">
        {visible.length === 0 ? (
          <p className="output__empty">No output yet.</p>
        ) : (
          visible.map((entry, i) => (
            <div key={i} className={`output__line output__line--${entry.level}`}>
              {entry.message}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
