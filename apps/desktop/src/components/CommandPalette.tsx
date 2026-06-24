import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  filterQuickPick,
  parsePaletteInput,
  type CommandRegistry,
  type QuickPickItem,
} from '@vsclaude/core-shell';

/** One rendered row, independent of which mode produced it. */
interface Row {
  id: string;
  label: string;
  description?: string;
  hint?: string;
  run: () => void;
}

export interface CommandPaletteProps {
  registry: CommandRegistry;
  /** The quick-open file index (empty when no workspace and no demo files). */
  files?: readonly QuickPickItem[];
  /** Open a file chosen in file mode. */
  onOpenFile?: (path: string) => void;
  /** Jump the active editor to a line and column in go-to mode. */
  onGotoLine?: (line: number, column?: number) => void;
  /** Called when file mode opens, so the index can be refreshed. */
  onRefreshFiles?: () => void;
}

const LIMIT = 50;

const OPEN_EVENT = 'vsclaude:palette-open';

/**
 * Open the palette in a given mode from anywhere (for example a command). This is
 * the same entry point the Ctrl or Cmd plus K and plus P shortcuts use, so a
 * command that calls it can honestly advertise that shortcut. An optional `seed`
 * pre-fills the input, for example ":" to land directly in go-to-line.
 */
export function openPalette(mode: 'commands' | 'files', seed = ''): void {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { mode, seed } }));
}

/**
 * The unified palette: the keyboard-first spine of the UX. Ctrl or Cmd plus K
 * opens command mode, Ctrl or Cmd plus P opens file quick-open, and the input
 * routes live on a prefix (`>` commands, `:` go to line). It is driven by the
 * core-shell command registry and the reusable quick-pick framework.
 */
export function CommandPalette({
  registry,
  files = [],
  onOpenFile,
  onGotoLine,
  onRefreshFiles,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [base, setBase] = useState<'commands' | 'files'>('commands');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Refs mirror the latest state and props so the single global key listener can
  // stay registered once without going stale.
  const openRef = useRef(open);
  const baseRef = useRef(base);
  const refreshRef = useRef(onRefreshFiles);
  openRef.current = open;
  baseRef.current = base;
  refreshRef.current = onRefreshFiles;

  const openTo = useCallback((next: 'commands' | 'files', seed = '') => {
    baseRef.current = next;
    setBase(next);
    setQuery(seed);
    setActive(0);
    setOpen(true);
    if (next === 'files') refreshRef.current?.();
  }, []);

  const toggleTo = useCallback(
    (next: 'commands' | 'files') => {
      if (openRef.current && baseRef.current === next) {
        setOpen(false);
        return;
      }
      openTo(next);
    },
    [openTo],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === 'k') {
        e.preventDefault();
        toggleTo('commands');
      } else if ((e.ctrlKey || e.metaKey) && key === 'p') {
        e.preventDefault();
        toggleTo('files');
      } else if ((e.ctrlKey || e.metaKey) && key === 'g') {
        // Go to line: open the palette seeded into go-to-line mode.
        e.preventDefault();
        openTo('files', ':');
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    const onOpenRequest = (e: Event) => {
      const detail = (e as CustomEvent<{ mode?: 'commands' | 'files'; seed?: string }>).detail;
      openTo(detail?.mode === 'files' ? 'files' : 'commands', detail?.seed ?? '');
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_EVENT, onOpenRequest);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_EVENT, onOpenRequest);
    };
  }, [toggleTo, openTo]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  useEffect(() => {
    setActive(0);
  }, [query]);

  const parsed = useMemo(() => parsePaletteInput(query, base), [query, base]);

  const rows = useMemo<Row[]>(() => {
    if (parsed.mode === 'commands') {
      return registry
        .fuzzyFind(parsed.query)
        .slice(0, LIMIT)
        .map((match) => ({
          id: match.command.id,
          label: match.command.title,
          hint: match.command.keybinding,
          run: () => void registry.run(match.command.id),
        }));
    }
    if (parsed.mode === 'files') {
      return filterQuickPick(parsed.query, files, LIMIT).map((item) => ({
        id: item.id,
        label: item.label,
        description: item.description,
        run: () => onOpenFile?.(item.id),
      }));
    }
    // Go-to-line mode: a single actionable row once a line number is present.
    if (parsed.line !== undefined) {
      const target = parsed.column !== undefined ? `${parsed.line}:${parsed.column}` : `${parsed.line}`;
      return [
        {
          id: 'goto-line',
          label: `Go to line ${target}`,
          run: () => onGotoLine?.(parsed.line as number, parsed.column),
        },
      ];
    }
    return [];
  }, [parsed, registry, files, onOpenFile, onGotoLine]);

  if (!open) return null;

  const dialogLabel = base === 'commands' ? 'Command palette' : 'Go to File';
  const placeholder =
    parsed.mode === 'commands'
      ? 'Type a command...'
      : parsed.mode === 'files'
        ? 'Search files by name...'
        : 'Go to line and column...';
  const emptyMessage =
    parsed.mode === 'commands'
      ? 'No matching commands'
      : parsed.mode === 'goto'
        ? 'Type a line number, for example 42'
        : 'No matching files';

  const clampedActive = Math.min(active, Math.max(0, rows.length - 1));
  const activeId = rows[clampedActive] ? `palette-opt-${clampedActive}` : undefined;

  const choose = (row: Row) => {
    row.run();
    setOpen(false);
  };

  return (
    <div
      className="palette-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={dialogLabel}
      onClick={() => setOpen(false)}
    >
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette__input"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-listbox"
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, rows.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              const row = rows[clampedActive];
              if (row) choose(row);
            }
          }}
        />
        <ul className="palette__list" id="palette-listbox" role="listbox" aria-label={dialogLabel}>
          {rows.map((row, i) => (
            <li key={row.id} role="presentation">
              <button
                type="button"
                role="option"
                id={`palette-opt-${i}`}
                aria-selected={i === clampedActive}
                className={`palette__item${i === clampedActive ? ' palette__item--active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(row)}
              >
                <span className="palette__label">{row.label}</span>
                {row.description ? <span className="palette__desc">{row.description}</span> : null}
                {row.hint ? <span className="palette__hint">{row.hint}</span> : null}
              </button>
            </li>
          ))}
          {rows.length === 0 ? <li className="palette__empty">{emptyMessage}</li> : null}
        </ul>
      </div>
    </div>
  );
}
