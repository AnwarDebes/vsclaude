import type { WorkerDescriptor, DelegationEdge, TokenAggregate } from '@vsclaude/swarm';
import { AGENT_ACTION_BY_ID } from '@vsclaude/contracts';
import { ActionIcon } from '../components/ActionIcon';

interface SwarmPanelProps {
  roster: WorkerDescriptor[];
  edges: DelegationEdge[];
  actionByAgent: Record<string, string>;
  tokens: TokenAggregate;
}

function AgentCard({
  worker,
  actionId,
  big,
}: {
  worker: WorkerDescriptor;
  actionId: string;
  big?: boolean;
}) {
  const action = AGENT_ACTION_BY_ID[actionId];
  return (
    <div className={`agent-card${big ? ' agent-card--orchestrator' : ''}`} data-status={worker.status}>
      <ActionIcon id={actionId} size={big ? 88 : 64} label={`${worker.agentId}: ${action?.caption ?? ''}`} />
      <div className="agent-card__meta">
        <span className="agent-card__name">{worker.agentId}</span>
        <span className="agent-card__task">{worker.task}</span>
        <span className="agent-card__action">
          <span className="agent-card__action-dot" data-status={worker.status} aria-hidden />
          {action?.label ?? actionId}
        </span>
      </div>
    </div>
  );
}

/**
 * The orchestration view: the orchestrator at the top with its worker agents
 * below, each Pixie performing its own current action, connected by delegation
 * threads. Per-agent and aggregate token meters surface the cost of the run.
 */
export function SwarmPanel({ roster, edges, actionByAgent, tokens }: SwarmPanelProps) {
  const root = roster.find((w) => w.parent === null) ?? roster[0];
  const workers = roster.filter((w) => w.parent !== null);

  return (
    <section className="swarm-panel" aria-label="Agent swarm">
      <header className="swarm-panel__header">
        <h2 className="panel-title">Swarm</h2>
        <div className="swarm-panel__meters">
          <span>{roster.length} agents</span>
          <span>{edges.length} threads</span>
          <span>{(tokens.input + tokens.output).toLocaleString()} tokens</span>
          <span className="swarm-panel__cost">${tokens.costUsd.toFixed(2)}</span>
        </div>
      </header>

      {root ? (
        <div className="swarm-panel__workshop">
          <AgentCard worker={root} actionId={actionByAgent[root.agentId] ?? 'rest'} big />
          {workers.length > 0 ? <div className="swarm-panel__threads" aria-hidden /> : null}
          <div className="swarm-panel__workers">
            {workers.map((worker) => (
              <AgentCard
                key={worker.agentId}
                worker={worker}
                actionId={actionByAgent[worker.agentId] ?? 'rest'}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="swarm-panel__empty">No agents running yet.</p>
      )}
    </section>
  );
}
