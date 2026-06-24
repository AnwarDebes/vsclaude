import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
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
 * the agent's command activity as a read-only log.
 */
export function TerminalPanel({ fallbackLines, cwd, initialCommand }: TerminalPanelProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const term = new Terminal({
      fontFamily: "'JetBrains Mono', 'Cascadia Code', ui-monospace, monospace",
      fontSize: 12,
      cursorBlink: true,
      theme: { background: '#161210', foreground: '#f3ece6', cursor: '#d97757' },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host);
    fit.fit();

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
      term.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="terminal-panel" aria-label="Terminal">
      <div className="terminal-host" ref={hostRef} />
    </section>
  );
}

type UnlistenFnLike = (() => void) | null;
