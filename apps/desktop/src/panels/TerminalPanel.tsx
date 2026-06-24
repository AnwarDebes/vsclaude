import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { isTauri, onPtyData, onPtyExit, ptyCreate, ptyKill, ptyResize, ptyWrite } from '../lib/tauri';

interface TerminalPanelProps {
  /** Lines to show in the browser fallback (the agent's command activity). */
  fallbackLines?: string[];
  cwd?: string;
  /** A command run once the shell is ready (for example a task). */
  initialCommand?: string;
}

/**
 * The integrated terminal. In the native app it spawns a real shell over the
 * Rust PTY and streams it through xterm with full input. In the browser it shows
 * the agent's command activity as a read-only log. URLs are clickable (web-links
 * addon) and Ctrl or Cmd plus F opens a find bar (search addon).
 */
export function TerminalPanel({ fallbackLines, cwd, initialCommand }: TerminalPanelProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<SearchAddon | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const ptyIdRef = useRef<string | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const term = new Terminal({
      fontFamily: "'JetBrains Mono', 'Cascadia Code', ui-monospace, monospace",
      fontSize: 12,
      cursorBlink: true,
      theme: { background: '#161210', foreground: '#f3ece6', cursor: '#d97757' },
    });
    termRef.current = term;
    const fit = new FitAddon();
    const search = new SearchAddon();
    searchRef.current = search;
    term.loadAddon(fit);
    term.loadAddon(search);
    term.loadAddon(new WebLinksAddon());
    term.open(host);
    fit.fit();

    // Open the find bar on Ctrl or Cmd plus F instead of letting xterm see it.
    term.attachCustomKeyEventHandler((e) => {
      if (e.type === 'keydown' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setFindOpen(true);
        return false;
      }
      return true;
    });

    let ptyId: string | null = null;
    let unlistenData: UnlistenFnLike = null;
    let unlistenExit: UnlistenFnLike = null;
    let disposed = false;

    if (isTauri()) {
      void (async () => {
        try {
          ptyId = await ptyCreate(term.cols, term.rows, cwd ? { cwd } : undefined);
          if (disposed) {
            void ptyKill(ptyId);
            return;
          }
          ptyIdRef.current = ptyId;
          unlistenData = await onPtyData((p) => {
            if (p.ptyId === ptyId) term.write(p.data);
          });
          unlistenExit = await onPtyExit((p) => {
            if (p.ptyId === ptyId) term.writeln('\r\n\x1b[2m[process exited]\x1b[0m');
          });
          term.onData((d) => {
            if (ptyId) void ptyWrite(ptyId, d);
          });
          // Run the requested command (for example a task) once the shell is up.
          if (initialCommand) void ptyWrite(ptyId, `${initialCommand}\r`);
        } catch (err) {
          term.writeln(`\x1b[31mcould not start the shell: ${String(err)}\x1b[0m`);
        }
      })();
    } else {
      term.writeln('\x1b[38;2;217;119;87mvsclaude terminal\x1b[0m');
      term.writeln('\x1b[2mThe live shell runs in the native app (pnpm tauri dev).\x1b[0m');
      term.writeln('');
      for (const line of fallbackLines ?? []) term.writeln(line);
    }

    const onResize = () => {
      fit.fit();
      if (ptyId) void ptyResize(ptyId, term.cols, term.rows);
    };
    window.addEventListener('resize', onResize);
    const observer = new ResizeObserver(onResize);
    observer.observe(host);

    return () => {
      disposed = true;
      window.removeEventListener('resize', onResize);
      observer.disconnect();
      unlistenData?.();
      unlistenExit?.();
      if (ptyId) void ptyKill(ptyId);
      ptyIdRef.current = null;
      searchRef.current = null;
      termRef.current = null;
      term.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runFind = (back: boolean) => {
    if (!findQuery) return;
    if (back) searchRef.current?.findPrevious(findQuery);
    else searchRef.current?.findNext(findQuery);
  };
  const closeFind = () => {
    setFindOpen(false);
    termRef.current?.focus();
  };

  const copySelection = () => {
    const selection = termRef.current?.getSelection();
    if (selection) void navigator.clipboard?.writeText(selection);
    setMenu(null);
  };
  const pasteClipboard = () => {
    void navigator.clipboard?.readText().then((text) => {
      if (text && ptyIdRef.current) void ptyWrite(ptyIdRef.current, text);
    });
    setMenu(null);
  };
  const selectAll = () => {
    termRef.current?.selectAll();
    setMenu(null);
  };
  const clearTerminal = () => {
    termRef.current?.clear();
    setMenu(null);
    termRef.current?.focus();
  };

  return (
    <section
      className="terminal-panel"
      aria-label="Terminal"
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      {findOpen ? (
        <div className="terminal-find">
          <input
            className="terminal-find__input"
            aria-label="Find in terminal"
            placeholder="Find"
            value={findQuery}
            autoFocus
            onChange={(e) => setFindQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                runFind(e.shiftKey);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                closeFind();
              }
            }}
          />
          <button type="button" className="terminal-find__btn" aria-label="Find previous" onClick={() => runFind(true)}>
            Prev
          </button>
          <button type="button" className="terminal-find__btn" aria-label="Find next" onClick={() => runFind(false)}>
            Next
          </button>
          <button type="button" className="terminal-find__btn" aria-label="Close find" onClick={closeFind}>
            Close
          </button>
        </div>
      ) : null}
      <div className="terminal-host" ref={hostRef} />
      {menu ? (
        <>
          <div
            className="terminal-ctx__backdrop"
            onClick={() => setMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu(null);
            }}
          />
          <div className="terminal-ctx" role="menu" aria-label="Terminal actions" style={{ top: menu.y, left: menu.x }}>
            <button type="button" role="menuitem" className="terminal-ctx__item" onClick={copySelection}>
              Copy
            </button>
            <button type="button" role="menuitem" className="terminal-ctx__item" onClick={pasteClipboard}>
              Paste
            </button>
            <button type="button" role="menuitem" className="terminal-ctx__item" onClick={selectAll}>
              Select All
            </button>
            <button type="button" role="menuitem" className="terminal-ctx__item" onClick={clearTerminal}>
              Clear
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}

type UnlistenFnLike = (() => void) | null;
