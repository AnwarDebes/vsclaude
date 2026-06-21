import type { AgentTree } from '@vsclaude/contracts';
import type { TokenAggregate } from '@vsclaude/swarm';

interface TokenPanelProps {
  tokens: TokenAggregate;
  tree: AgentTree;
}

/**
 * A live token and cost dashboard. It shows the aggregate input, output, and
 * dollar cost of the run, plus a per-agent breakdown so you can see which agent
 * is spending the budget.
 */
export function TokenPanel({ tokens, tree }: TokenPanelProps) {
  const nodes = Object.values(tree.nodes).filter((n) => n.tokens);
  const max = Math.max(1, ...nodes.map((n) => (n.tokens?.input ?? 0) + (n.tokens?.output ?? 0)));
  const total = tokens.input + tokens.output;

  return (
    <section className="token-panel" aria-label="Tokens and cost">
      <h2 className="panel-title">Cost</h2>
      <div className="token-panel__totals">
        <div className="token-stat">
          <span className="token-stat__value">{total.toLocaleString()}</span>
          <span className="token-stat__label">tokens</span>
        </div>
        <div className="token-stat">
          <span className="token-stat__value">{tokens.input.toLocaleString()}</span>
          <span className="token-stat__label">in</span>
        </div>
        <div className="token-stat">
          <span className="token-stat__value">{tokens.output.toLocaleString()}</span>
          <span className="token-stat__label">out</span>
        </div>
        <div className="token-stat token-stat--cost">
          <span className="token-stat__value">${tokens.costUsd.toFixed(2)}</span>
          <span className="token-stat__label">cost</span>
        </div>
      </div>
      <ul className="token-panel__bars">
        {nodes.map((node) => {
          const used = (node.tokens?.input ?? 0) + (node.tokens?.output ?? 0);
          return (
            <li key={node.agentId} className="token-bar">
              <span className="token-bar__name">{node.agentId}</span>
              <span className="token-bar__track">
                <span className="token-bar__fill" style={{ width: `${(used / max) * 100}%` }} />
              </span>
              <span className="token-bar__value">{used.toLocaleString()}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
