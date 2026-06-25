import type { Conflict, ConflictChoice } from '../lib/conflicts';

export interface MergeConflictBarProps {
  conflicts: readonly Conflict[];
  onResolve: (conflict: Conflict, choice: ConflictChoice) => void;
}

/**
 * A bar above the editor when the file has git merge conflicts: it counts them and
 * offers Accept Current / Incoming / Both per conflict. Resolving rewrites the file
 * (resolveConflict), which removes the block and updates the count.
 */
export function MergeConflictBar({ conflicts, onResolve }: MergeConflictBarProps) {
  if (conflicts.length === 0) return null;
  return (
    <section className="merge-bar" role="region" aria-label="Merge conflicts">
      <span className="merge-bar__count">
        {conflicts.length} merge conflict{conflicts.length === 1 ? '' : 's'}
      </span>
      {conflicts.map((conflict) => (
        <div className="merge-bar__item" key={`${conflict.start}-${conflict.end}`}>
          <span className="merge-bar__loc">Line {conflict.start}</span>
          <button
            type="button"
            className="btn btn--ghost merge-bar__btn"
            onClick={() => onResolve(conflict, 'current')}
          >
            Accept Current
          </button>
          <button
            type="button"
            className="btn btn--ghost merge-bar__btn"
            onClick={() => onResolve(conflict, 'incoming')}
          >
            Accept Incoming
          </button>
          <button
            type="button"
            className="btn btn--ghost merge-bar__btn"
            onClick={() => onResolve(conflict, 'both')}
          >
            Accept Both
          </button>
        </div>
      ))}
    </section>
  );
}
