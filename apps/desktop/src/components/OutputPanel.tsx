import { useSyncExternalStore } from 'react';
import { clearLog, getLog, subscribeLog } from '../lib/output-log';

export interface OutputPanelProps {
  onClose: () => void;
}

/**
 * The Output panel: a read-only view of the vsclaude log channel (startup,
 * opening a folder, running a task, errors). A single channel for now; per-channel
 * and log-level filtering are follow-ups.
 */
export function OutputPanel({ onClose }: OutputPanelProps) {
  const lines = useSyncExternalStore(subscribeLog, getLog, getLog);

  return (
    <section className="output" role="region" aria-label="Output">
      <header className="output__header">
        <h2 className="output__title">Output</h2>
        <button type="button" className="output__action" onClick={() => clearLog()}>
          Clear
        </button>
        <button type="button" className="btn btn--ghost output__close" aria-label="Close Output panel" onClick={onClose}>
          Close
        </button>
      </header>
      <div className="output__body">
        {lines.length === 0 ? (
          <p className="output__empty">No output yet.</p>
        ) : (
          lines.map((line, i) => (
            <div key={i} className="output__line">
              {line}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
