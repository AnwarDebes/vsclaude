import { useCallback, useEffect, useRef, useState } from 'react';
import {
  activateTerminal,
  closeTerminal,
  EMPTY_TERMINAL_TABS,
  openTerminal,
  renameTerminal,
  type TerminalTabsState,
} from '@vsclaude/terminal';
import { TerminalPanel } from '../panels/TerminalPanel';

const NEW_TERMINAL_EVENT = 'vsclaude:terminal-new';
const RUN_TERMINAL_EVENT = 'vsclaude:terminal-run';

/** Open a new terminal from anywhere (for example a command). */
export function requestNewTerminal(): void {
  window.dispatchEvent(new CustomEvent(NEW_TERMINAL_EVENT));
}

/** Open a new terminal that runs a command, with a title (for example a task). */
export function requestRunInTerminal(command: string, title: string): void {
  window.dispatchEvent(new CustomEvent(RUN_TERMINAL_EVENT, { detail: { command, title } }));
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startRename = (id: string, title: string) => {
    setEditingId(id);
    setEditValue(title);
  };
  const commitRename = () => {
    if (editingId && editValue.trim()) {
      const id = editingId;
      const title = editValue.trim();
      setState((s) => renameTerminal(s, id, title));
    }
    setEditingId(null);
  };

  const addTerminal = useCallback((command?: string, title?: string) => {
    counter.current += 1;
    const n = counter.current;
    setState((s) =>
      openTerminal(s, { id: `term-${n}`, title: title ?? `Terminal ${n}`, command }),
    );
  }, []);

  useEffect(() => {
    const onNew = () => addTerminal();
    const onRun = (e: Event) => {
      const detail = (e as CustomEvent<{ command?: string; title?: string }>).detail;
      if (detail?.command) addTerminal(detail.command, detail.title);
    };
    window.addEventListener(NEW_TERMINAL_EVENT, onNew);
    window.addEventListener(RUN_TERMINAL_EVENT, onRun);
    return () => {
      window.removeEventListener(NEW_TERMINAL_EVENT, onNew);
      window.removeEventListener(RUN_TERMINAL_EVENT, onRun);
    };
  }, [addTerminal]);

  const firstId = state.tabs[0]?.id;

  return (
    <section className="terminal-tabs" aria-label="Terminal">
      <div className="terminal-tabbar" role="tablist" aria-label="Terminals">
        {state.tabs.map((tab) => {
          const isActive = tab.id === state.activeId;
          return (
            <div key={tab.id} className={`terminal-tab${isActive ? ' is-active' : ''}`}>
              {editingId === tab.id ? (
                <input
                  className="terminal-tab__rename"
                  aria-label="Rename terminal"
                  value={editValue}
                  autoFocus
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitRename();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setEditingId(null);
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className="terminal-tab__label"
                  onClick={() => setState((s) => activateTerminal(s, tab.id))}
                  onDoubleClick={() => startRename(tab.id, tab.title)}
                >
                  {tab.title}
                </button>
              )}
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
          onClick={() => addTerminal()}
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
            <TerminalPanel
              fallbackLines={tab.id === firstId ? fallbackLines : []}
              cwd={cwd}
              initialCommand={tab.command}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
