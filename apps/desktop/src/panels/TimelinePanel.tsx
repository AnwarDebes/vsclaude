import { useState } from 'react';
import type { AgentEvent } from '@vsclaude/contracts';
import { inspectorModel, type TimelineItem } from '@vsclaude/chat';
import { classifyAction } from '@vsclaude/motion';
import { AGENT_ACTION_BY_ID } from '@vsclaude/contracts';
import { ActionIcon } from '../components/ActionIcon';

interface TimelinePanelProps {
  timeline: TimelineItem[];
}

function itemEvent(item: TimelineItem): AgentEvent {
  switch (item.kind) {
    case 'toolCall':
      return item.callEvent;
    case 'command':
      return item.runEvent;
    default:
      return item.event;
  }
}

function itemTitle(item: TimelineItem): string {
  switch (item.kind) {
    case 'message':
      return item.payload.text;
    case 'thinking':
      return item.payload.text;
    case 'toolCall':
      return `${item.toolName || 'tool'} (${item.status})`;
    case 'fileChange':
      return item.path;
    case 'command':
      return item.command;
    case 'plan':
      return `${item.todos.length} step plan`;
  }
}

/**
 * The conversation timeline (sacred rule 2: meaning is always recoverable). Each
 * item is built by the chat package, shows the resolved action, and expands into
 * the tool-call inspector: the exact title, fields, and raw event.
 */
export function TimelinePanel({ timeline }: TimelinePanelProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <aside className="timeline-panel" aria-label="Conversation timeline">
      <h2 className="panel-title">Timeline</h2>
      <ol className="timeline-list">
        {timeline.map((item) => {
          const event = itemEvent(item);
          const actionId = classifyAction(event);
          const action = AGENT_ACTION_BY_ID[actionId];
          const open = item.id === openId;
          const model = open ? inspectorModel(event) : null;
          return (
            <li key={item.id} className="timeline-item" data-kind={item.kind}>
              <button
                type="button"
                className="timeline-item__head"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : item.id)}
              >
                <span className="timeline-item__icon" aria-hidden>
                  <ActionIcon id={actionId} size={28} label={action?.label} />
                </span>
                <span className="timeline-item__title">{itemTitle(item)}</span>
                <span className="timeline-item__kind">{action?.label ?? item.kind}</span>
              </button>
              {model ? (
                <div className="timeline-item__inspector" tabIndex={0}>
                  <div className="inspector__title">{model.title}</div>
                  <dl className="inspector__fields">
                    {model.fields.map((field) => (
                      <div className="inspector__row" key={field.label}>
                        <dt>{field.label}</dt>
                        <dd>{field.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
