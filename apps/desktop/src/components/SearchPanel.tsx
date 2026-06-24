import { useEffect, useState } from 'react';
import type { SearchResult } from '@vsclaude/contracts';
import { basePathName } from '@vsclaude/editor';
import { isTauri } from '../lib/tauri';
import { searchFind } from '../workspace/searchClient';
import { splitLineByRanges, summarizeSearch } from '../workspace/searchModel';

export interface SearchPanelProps {
  /** The root folder to search, or null when no workspace is open. */
  root: string | null;
  onOpen: (path: string, line: number, column: number) => void;
  onClose: () => void;
}

function splitGlobs(value: string): string[] | undefined {
  const globs = value
    .split(',')
    .map((g) => g.trim())
    .filter((g) => g.length > 0);
  return globs.length > 0 ? globs : undefined;
}

/**
 * Project-wide search: a query box with regex, case, and whole-word toggles,
 * include and exclude globs, and a results tree grouped by file where each match
 * opens its file at the line. The engine runs in the Rust core; in the browser
 * demo (no workspace) the panel invites the user to open a folder.
 */
export function SearchPanel({ root, onOpen, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [regex, setRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [include, setInclude] = useState('');
  const [exclude, setExclude] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauri() || !root || query.trim().length === 0) {
      setResult(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setBusy(true);
    const handle = setTimeout(() => {
      void searchFind(root, query, {
        regex,
        caseSensitive,
        wholeWord,
        includeGlobs: splitGlobs(include),
        excludeGlobs: splitGlobs(exclude),
      })
        .then((res) => {
          if (cancelled) return;
          setResult(res);
          setError(null);
        })
        .catch((e) => {
          if (cancelled) return;
          setError(String(e));
          setResult(null);
        })
        .finally(() => {
          if (!cancelled) setBusy(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [root, query, regex, caseSensitive, wholeWord, include, exclude]);

  const summary = result ? summarizeSearch(result) : null;

  return (
    <section className="search" role="region" aria-label="Search">
      <header className="search__header">
        <h2 className="search__title">Search</h2>
        <button
          type="button"
          className="btn btn--ghost search__close"
          aria-label="Close Search panel"
          onClick={onClose}
        >
          Close
        </button>
      </header>

      <div className="search__controls">
        <div className="search__queryrow">
          <input
            className="search__input"
            aria-label="Search"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="search__toggles" role="group" aria-label="Search options">
            <button
              type="button"
              className={`search__toggle${regex ? ' is-on' : ''}`}
              aria-pressed={regex}
              title="Use regular expression"
              aria-label="Use regular expression"
              onClick={() => setRegex((v) => !v)}
            >
              .*
            </button>
            <button
              type="button"
              className={`search__toggle${caseSensitive ? ' is-on' : ''}`}
              aria-pressed={caseSensitive}
              title="Match case"
              aria-label="Match case"
              onClick={() => setCaseSensitive((v) => !v)}
            >
              Aa
            </button>
            <button
              type="button"
              className={`search__toggle${wholeWord ? ' is-on' : ''}`}
              aria-pressed={wholeWord}
              title="Match whole word"
              aria-label="Match whole word"
              onClick={() => setWholeWord((v) => !v)}
            >
              ab
            </button>
          </div>
        </div>
        <div className="search__globs">
          <input
            className="search__glob"
            aria-label="Files to include"
            placeholder="files to include (for example src/**)"
            value={include}
            onChange={(e) => setInclude(e.target.value)}
          />
          <input
            className="search__glob"
            aria-label="Files to exclude"
            placeholder="files to exclude"
            value={exclude}
            onChange={(e) => setExclude(e.target.value)}
          />
        </div>
      </div>

      <div className="search__body">
        {!isTauri() || !root ? (
          <p className="search__note">Open a folder to search across your project.</p>
        ) : error ? (
          <p className="search__error">{error}</p>
        ) : query.trim().length === 0 ? (
          <p className="search__note">Type to search across the workspace.</p>
        ) : busy && !result ? (
          <p className="search__note">Searching...</p>
        ) : summary && summary.matchCount === 0 ? (
          <p className="search__note">No results found.</p>
        ) : result ? (
          <>
            <p className="search__summary">
              {summary?.matchCount} results in {summary?.fileCount} files
              {result.truncated ? ' (showing the first matches)' : ''}
            </p>
            {result.files.map((file) => (
              <div key={file.path} className="search__file" role="group" aria-label={basePathName(file.path)}>
                <div className="search__filehead">
                  <span className="search__filename">{basePathName(file.path)}</span>
                  <span className="search__filedir">{file.path}</span>
                  <span className="search__filecount">{file.lines.length}</span>
                </div>
                <ul className="search__matches">
                  {file.lines.map((match, i) => {
                    const column = (match.ranges[0]?.start ?? 0) + 1;
                    return (
                      <li key={`${match.line}:${i}`}>
                        <button
                          type="button"
                          className="search__match"
                          aria-label={`Line ${match.line}: ${match.text.trim()}`}
                          onClick={() => onOpen(file.path, match.line, column)}
                        >
                          <span className="search__matchline">{match.line}</span>
                          <span className="search__matchtext">
                            {splitLineByRanges(match.text, match.ranges).map((seg, j) =>
                              seg.match ? (
                                <mark key={j} className="search__hit">
                                  {seg.text}
                                </mark>
                              ) : (
                                <span key={j}>{seg.text}</span>
                              ),
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </>
        ) : null}
      </div>
    </section>
  );
}
