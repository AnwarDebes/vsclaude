import { outlineSymbols } from '../lib/workspace-symbols';

export interface OutlinePanelProps {
  /** The active file path, or null. */
  path: string | null;
  /** The active file content. */
  content: string;
  onReveal: (line: number) => void;
  onClose: () => void;
}

/**
 * The Outline view: the symbols of the active file. Markdown contributes its
 * headings; code files contribute their top-level declarations. Clicking an entry
 * reveals its line in the editor.
 */
export function OutlinePanel({ path, content, onReveal, onClose }: OutlinePanelProps) {
  const symbols = path ? outlineSymbols(path, content) : [];

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
