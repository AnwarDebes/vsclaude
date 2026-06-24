export interface NarrationLogProps {
  narration: string[];
  onClose: () => void;
}

/**
 * An accessible history of the narration captions, in a log region so a screen
 * reader can review what the agent did. The live announcer stays in Narration.tsx;
 * this is the scrollable record.
 */
export function NarrationLog({ narration, onClose }: NarrationLogProps) {
  return (
    <section className="narration-log" role="log" aria-label="Narration log">
      <header className="narration-log__header">
        <h2 className="narration-log__title">Narration Log</h2>
        <button
          type="button"
          className="btn btn--ghost narration-log__close"
          aria-label="Close Narration Log"
          onClick={onClose}
        >
          Close
        </button>
      </header>
      <ol className="narration-log__list">
        {narration.length === 0 ? (
          <li className="narration-log__empty">No narration yet.</li>
        ) : (
          narration.map((caption, i) => (
            <li key={`${i}-${caption}`} className="narration-log__line">
              {caption}
            </li>
          ))
        )}
      </ol>
    </section>
  );
}
