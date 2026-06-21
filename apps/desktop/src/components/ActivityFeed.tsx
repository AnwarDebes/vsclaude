import { useState } from 'react';
import { AGENT_ACTION_BY_ID, type AgentEvent } from '@vsclaude/contracts';
import { classifyAction } from '@vsclaude/motion';
import { captionFor } from '../lib/motion-lite';
import { ActionIcon } from './ActionIcon';

interface ActivityFeedProps {
  events: AgentEvent[];
}

/**
 * The recoverable-truth panel (sacred rule 2). Each animated moment also lands
 * here as a readable line: Pixie performing the resolved action, its label, and
 * a plain-language caption. One click expands the exact underlying detail: the
 * tool, the inputs, the payload, the raw provider event.
 */
export function ActivityFeed({ events }: ActivityFeedProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <aside className="activity-feed" aria-label="Activity timeline">
      <h2 className="activity-feed__title">Activity</h2>
      <ol className="activity-feed__list">
        {events.map((event) => {
          const open = event.id === openId;
          const actionId = classifyAction(event);
          const action = AGENT_ACTION_BY_ID[actionId];
          return (
            <li key={event.id} className="activity-item" data-type={event.type}>
              <button
                type="button"
                className="activity-item__head"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : event.id)}
              >
                <span className="activity-item__icon" aria-hidden>
                  <ActionIcon id={actionId} size={30} label={action?.label} />
                </span>
                <span className="activity-item__caption">{captionFor(event) ?? action?.caption}</span>
                <span className="activity-item__type">{action?.label ?? event.type}</span>
              </button>
              {open ? (
                <pre className="activity-item__detail" tabIndex={0}>
                  {JSON.stringify(
                    { action: actionId, tool: event.tool, payload: event.payload, raw: event.raw },
                    null,
                    2,
                  )}
                </pre>
              ) : null}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
