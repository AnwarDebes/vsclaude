import { useState } from 'react';
import type { AgentEvent } from '@vsclaude/contracts';
import { captionFor } from '../lib/motion-lite';

interface ActivityFeedProps {
  events: AgentEvent[];
}

/**
 * The recoverable-truth panel (sacred rule 2). Each animated moment also lands
 * here as a readable line, and one click expands the exact underlying detail:
 * the tool, the inputs, the payload, the raw provider event.
 */
export function ActivityFeed({ events }: ActivityFeedProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <aside className="activity-feed" aria-label="Activity timeline">
      <h2 className="activity-feed__title">Activity</h2>
      <ol className="activity-feed__list">
        {events.map((event) => {
          const open = event.id === openId;
          return (
            <li key={event.id} className="activity-item" data-type={event.type}>
              <button
                type="button"
                className="activity-item__head"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : event.id)}
              >
                <span className={`activity-item__dot activity-item__dot--${event.type}`} aria-hidden />
                <span className="activity-item__caption">{captionFor(event) ?? event.type}</span>
                <span className="activity-item__type">{event.type}</span>
              </button>
              {open ? (
                <pre className="activity-item__detail" tabIndex={0}>
                  {JSON.stringify({ tool: event.tool, payload: event.payload, raw: event.raw }, null, 2)}
                </pre>
              ) : null}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
