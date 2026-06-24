import { markdownSymbols } from '../lib/symbols';

export interface OutlinePanelProps {
  /** The active file path, or null. */
  path: string | null;
  /** The active file content. */
  content: string;
  onReveal: (line: number) => void;
  onClose: () => void;
}

/**
 * The Outline view: the symbols of the active file. Markdown headings are
 * supported today; other languages show an empty state until their symbol
 * sources are added. Clicking an entry reveals its line in the editor.
 */
export function OutlinePanel({ path, content, onReveal, onClose }: OutlinePanelProps) {
  const isMarkdown = path?.toLowerCase().endsWith('.md') ?? false;
  const symbols = isMarkdown ? markdownSymbols(content) : [];

  return (
    <section className="outline" role="region" aria-label="Outline">
      <header className="outline__header">
        <h2 className="outline__title">Outline</h2>
        <button type="button" className="btn btn--ghost outline__close" aria-label="Close Outline panel" onClick={onClose}>
          Close
        </button>
      </header>
      <div className="outline__body">
        {symbols.length === 0 ? (
          <p className="outline__empty">
            {isMarkdown ? 'No headings in this file.' : 'Outline is available for Markdown files.'}
          </p>
        ) : (
          symbols.map((symbol, i) => (
            <button
              key={`${symbol.line}-${i}`}
              type="button"
              className="outline__item"
              style={{ paddingLeft: `${8 + (symbol.level - 1) * 14}px` }}
              onClick={() => onReveal(symbol.line)}
            >
              {symbol.name}
            </button>
          ))
        )}
      </div>
    </section>
  );
}
