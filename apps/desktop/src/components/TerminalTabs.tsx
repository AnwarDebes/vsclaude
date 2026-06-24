import { useCallback, useEffect, useRef, useState } from 'react';
import {
  activateTerminal,
  closeTerminal,
  EMPTY_TERMINAL_TABS,
  openTerminal,
  type TerminalTabsState,
} from '@vsclaude/terminal';
import { TerminalPanel } from '../panels/TerminalPanel';

const NEW_TERMINAL_EVENT = 'vsclaude:terminal-new';

/** Open a new terminal from anywhere (for example a command). */
export function requestNewTerminal(): void {
  window.dispatchEvent(new CustomEvent(NEW_TERMINAL_EVENT));
}

export interface TerminalTabsProps {
  fallbackLines?: string[];
  cwd?: string;
}

/**
 * Multiple terminals with a tab bar. Each tab owns its own xterm and PTY through a
 * TerminalPanel; the panels stay mounted (inactive ones hidden, not unmounted) so
 * their scrollback survives switching. The tab set is a pure reducer from the
 * terminal package; this component only wires it to the UI and the PTY panels.
 */
export function TerminalTabs({ fallbackLines, cwd }: TerminalTabsProps) {
  const counter = useRef(1);
  const [state, setState] = useState<TerminalTabsState>(() =>
    openTerminal(EMPTY_TERMINAL_TABS, { id: 'term-1', title: 'Terminal 1' }),
  );

  const addTerminal = useCallback(() => {
    counter.current += 1;
    const n = counter.current;
    setState((s) => openTerminal(s, { id: `term-${n}`, title: `Terminal ${n}` }));
  }, []);

  useEffect(() => {
    const handler = () => addTerminal();
    window.addEventListener(NEW_TERMINAL_EVENT, handler);
    return () => window.removeEventListener(NEW_TERMINAL_EVENT, handler);
  }, [addTerminal]);

  const firstId = state.tabs[0]?.id;

  return (
    <section className="terminal-tabs" aria-label="Terminal">
      <div className="terminal-tabbar" role="tablist" aria-label="Terminals">
        {state.tabs.map((tab) => {
          const isActive = tab.id === state.activeId;
          return (
            <div key={tab.id} className={`terminal-tab${isActive ? ' is-active' : ''}`}>
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                className="terminal-tab__label"
                onClick={() => setState((s) => activateTerminal(s, tab.id))}
              >
                {tab.title}
              </button>
              {state.tabs.length > 1 ? (
                <button
                  type="button"
                  className="terminal-tab__close"
                  aria-label={`Close ${tab.title}`}
                  onClick={() => setState((s) => closeTerminal(s, tab.id))}
                >
                  {'×'}
                </button>
              ) : null}
            </div>
          );
        })}
        <button
          type="button"
          className="terminal-tab__new"
          aria-label="New Terminal"
          title="New Terminal"
          onClick={addTerminal}
        >
          {'+'}
        </button>
      </div>
      <div className="terminal-stack">
        {state.tabs.map((tab) => (
          <div
            key={tab.id}
            className={`terminal-pane${tab.id === state.activeId ? ' is-active' : ''}`}
            role="tabpanel"
            aria-hidden={tab.id !== state.activeId}
          >
            <TerminalPanel fallbackLines={tab.id === firstId ? fallbackLines : []} cwd={cwd} />
          </div>
        ))}
      </div>
    </section>
  );
}
