import { outlineSymbols } from '../lib/workspace-symbols';

export interface OutlinePanelProps {
  /** The active file path, or null. */
  path: string | null;
  /** The active file content. */
  content: string;
  /** The one-based caret line, so the symbol containing it can be highlighted. */
  activeLine?: number | null;
  onReveal: (line: number) => void;
  onClose: () => void;
}

/**
 * The Outline view: the symbols of the active file. Markdown contributes its
 * headings; code files contribute their top-level declarations. Clicking an entry
 * reveals its line in the editor, and the entry containing the caret is highlighted
 * and tracked as it moves (follow-cursor).
 */
export function OutlinePanel({ path, content, activeLine, onReveal, onClose }: OutlinePanelProps) {
  const symbols = path ? outlineSymbols(path, content) : [];
  // The active entry is the last symbol that starts at or before the caret line.
  let activeIndex = -1;
  if (activeLine != null) {
    symbols.forEach((symbol, i) => {
      if (symbol.line <= activeLine) activeIndex = i;
    });
  }

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
          <p className="outline__empty">{path ? 'No symbols in this file.' : 'No file is open.'}</p>
        ) : (
          symbols.map((symbol, i) => (
            <button
              key={`${symbol.line}-${i}`}
              type="button"
              className={`outline__item${i === activeIndex ? ' outline__item--active' : ''}`}
              style={{ paddingLeft: `${8 + (symbol.level - 1) * 14}px` }}
              aria-current={i === activeIndex ? 'true' : undefined}
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
