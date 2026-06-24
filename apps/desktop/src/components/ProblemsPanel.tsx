import { useMemo, useState } from 'react';
import { groupDiagnosticsByResource, type Diagnostic, type DiagnosticSeverity } from '@vsclaude/core-shell';
import { basePathName } from '@vsclaude/editor';
import { FILTER_SEVERITIES, filterDiagnostics } from '../lib/problem-filter';

const ALL_SEVERITIES: DiagnosticSeverity[] = ['error', 'warning', 'info', 'hint'];

const SEVERITY_LABEL: Record<DiagnosticSeverity, string> = {
  error: 'Error',
  warning: 'Warning',
  info: 'Info',
  hint: 'Hint',
};

export interface ProblemsPanelProps {
  diagnostics: readonly Diagnostic[];
  onOpen: (resource: string, line: number, column: number) => void;
  onClose: () => void;
}

/**
 * The Problems panel: a drawer above the status bar that lists the editor's
 * diagnostics grouped by file, each row jumping to its location when clicked. It
 * is data driven from the normalized diagnostics model, so it does not care
 * whether a problem came from a Monaco worker, a language server, or a task.
 */
export function ProblemsPanel({ diagnostics, onOpen, onClose }: ProblemsPanelProps) {
  const [text, setText] = useState('');
  const [severities, setSeverities] = useState<ReadonlySet<DiagnosticSeverity>>(
    () => new Set(ALL_SEVERITIES),
  );

  const filtered = useMemo(
    () => filterDiagnostics(diagnostics, { text, severities }),
    [diagnostics, text, severities],
  );
  const groups = groupDiagnosticsByResource(filtered);

  const toggleSeverity = (severity: DiagnosticSeverity) => {
    setSeverities((current) => {
      const next = new Set(current);
      if (next.has(severity)) next.delete(severity);
      else next.add(severity);
      return next;
    });
  };

  return (
    <section className="problems" role="region" aria-label="Problems">
      <header className="problems__header">
        <h2 className="problems__title">Problems</h2>
        <span className="problems__count" aria-hidden>
          {filtered.length}
        </span>
        <button
          type="button"
          className="btn btn--ghost problems__close"
          aria-label="Close Problems panel"
          onClick={onClose}
        >
          Close
        </button>
      </header>
      <div className="problems__filter">
        <input
          className="problems__search"
          type="search"
          aria-label="Filter problems"
          placeholder="Filter by text"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {FILTER_SEVERITIES.map((severity) => (
          <button
            key={severity}
            type="button"
            className={`problems__sevtoggle problems__sevtoggle--${severity}`}
            aria-pressed={severities.has(severity)}
            aria-label={`Show ${SEVERITY_LABEL[severity]} problems`}
            onClick={() => toggleSeverity(severity)}
          >
            {SEVERITY_LABEL[severity]}
          </button>
        ))}
      </div>
      <div className="problems__body">
        {groups.length === 0 ? (
          <p className="problems__empty">
            {diagnostics.length === 0
              ? 'No problems have been detected.'
              : 'No problems match the filter.'}
          </p>
        ) : (
          groups.map((group) => {
            const name = basePathName(group.resource) || group.resource;
            return (
              <div key={group.resource} className="problems__group" role="group" aria-label={name}>
                <div className="problems__file">
                  <span className="problems__filename">{name}</span>
                  <span className="problems__dir">{group.resource}</span>
                </div>
                <ul className="problems__list">
                  {group.diagnostics.map((d, i) => (
                    <li key={`${d.line}:${d.column}:${i}`}>
                      <button
                        type="button"
                        className={`problems__item problems__item--${d.severity}`}
                        aria-label={`${SEVERITY_LABEL[d.severity]}: ${d.message}. Line ${d.line}, column ${d.column}.`}
                        onClick={() => onOpen(group.resource, d.line, d.column)}
                      >
                        <span className={`problems__sev problems__sev--${d.severity}`} aria-hidden>
                          {SEVERITY_LABEL[d.severity]}
                        </span>
                        <span className="problems__msg">{d.message}</span>
                        <span className="problems__pos" aria-hidden>{`[${d.line}, ${d.column}]`}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
