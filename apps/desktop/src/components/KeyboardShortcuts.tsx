import { useMemo, useState } from 'react';
import type { CommandRegistry } from '@vsclaude/core-shell';
import { filterShortcutRows, shortcutRows } from '../lib/shortcuts';
import { conflictingKeys, findKeybindingConflicts, normalizeKeybinding } from '../lib/keybinding-conflicts';

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
  const conflicts = useMemo(() => findKeybindingConflicts(rows), [rows]);
  const conflictKeys = useMemo(() => conflictingKeys(conflicts), [conflicts]);

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
        {/*
          Static, read-only summary: the conflict set is fixed for the panel's
          lifetime, so this is rendered as labeled text rather than an aria-live
          region (a region populated at mount is not reliably announced).
        */}
        {conflicts.length === 0 ? (
          <p className="shortcuts__conflicts shortcuts__conflicts--ok" aria-label="Keybinding conflicts">
            No keybinding conflicts.
          </p>
        ) : (
          <div className="shortcuts__conflicts shortcuts__conflicts--warn" aria-label="Keybinding conflicts">
            <strong>
              {conflicts.length} keybinding {conflicts.length === 1 ? 'conflict' : 'conflicts'}:
            </strong>{' '}
            {conflicts
              .map((c) => `${c.keybinding} (${c.commands.map((r) => r.title).join(', ')})`)
              .join('; ')}
          </div>
        )}
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
                  {row.keybinding && conflictKeys.has(normalizeKeybinding(row.keybinding)) ? (
                    <span
                      className="shortcuts__conflict-badge"
                      aria-label="Conflict: this gesture is bound to more than one command"
                      title="This gesture is bound to more than one command"
                    >
                      conflict
                    </span>
                  ) : null}
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
