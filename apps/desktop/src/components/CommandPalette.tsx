import { useEffect, useMemo, useRef, useState } from 'react';
import type { CommandRegistry } from '@vsclaude/core-shell';

/**
 * The command palette: the keyboard-first spine of the UX. Press Ctrl or Cmd
 * plus K to open it, type to fuzzy-find, and Enter to run. It is driven entirely
 * by the core-shell {@link CommandRegistry}.
 */
export function CommandPalette({ registry }: { registry: CommandRegistry }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => registry.fuzzyFind(query).slice(0, 8), [registry, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery('');
        setActive(0);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  useEffect(() => {
    setActive(0);
  }, [query]);

  if (!open) return null;

  const choose = (id: string) => {
    void registry.run(id);
    setOpen(false);
  };

  return (
    <div className="palette-overlay" role="dialog" aria-label="Command palette" onClick={() => setOpen(false)}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette__input"
          placeholder="Type a command..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, matches.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              const match = matches[active];
              if (match) choose(match.command.id);
            }
          }}
        />
        <ul className="palette__list">
          {matches.map((match, i) => (
            <li key={match.command.id}>
              <button
                type="button"
                className={`palette__item${i === active ? ' palette__item--active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(match.command.id)}
              >
                {match.command.title}
              </button>
            </li>
          ))}
          {matches.length === 0 ? <li className="palette__empty">No matching commands</li> : null}
        </ul>
      </div>
    </div>
  );
}
