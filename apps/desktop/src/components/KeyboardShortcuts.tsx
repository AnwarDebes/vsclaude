import { useMemo, useState } from 'react';
import type { CommandRegistry } from '@vsclaude/core-shell';
import { filterShortcutRows, shortcutRows } from '../lib/shortcuts';

export interface KeyboardShortcutsProps {
  registry: CommandRegistry;
  onClose: () => void;
}

/**
 * The Keyboard Shortcuts reference: a searchable list of every command and its
 * shortcut, read from the command registry. Read-only for now (no rebinding); it
 * is the discoverable, printable reference VS Code users expect.
 */
export function KeyboardShortcuts({ registry, onClose }: KeyboardShortcutsProps) {
  const [query, setQuery] = useState('');
  const rows = useMemo(() => shortcutRows(registry.list()), [registry]);
  const matches = useMemo(() => filterShortcutRows(query, rows), [query, rows]);

  return (
    <div className="shortcuts-overlay" role="dialog" aria-label="Keyboard Shortcuts" onClick={onClose}>
      <div className="shortcuts" onClick={(e) => e.stopPropagation()}>
        <header className="shortcuts__header">
          <h2 className="shortcuts__title">Keyboard Shortcuts</h2>
          <button type="button" className="btn btn--ghost shortcuts__close" aria-label="Close Keyboard Shortcuts" onClick={onClose}>
            Close
          </button>
        </header>
        <input
          className="shortcuts__search"
          aria-label="Search shortcuts"
          placeholder="Search by command or key"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <table className="shortcuts__table">
          <thead>
            <tr>
              <th scope="col">Command</th>
              <th scope="col">Keybinding</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((row) => (
              <tr key={row.id} className="shortcuts__row">
                <td className="shortcuts__command">{row.title}</td>
                <td className="shortcuts__key">
                  {row.keybinding ? <kbd>{row.keybinding}</kbd> : <span className="shortcuts__unbound">unbound</span>}
                </td>
              </tr>
            ))}
            {matches.length === 0 ? (
              <tr>
                <td colSpan={2} className="shortcuts__empty">
                  No commands match your search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
