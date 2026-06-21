interface NarrationProps {
  narration: string[];
}

/**
 * The narrated event stream (accessibility): the watch-instead-of-read promise
 * must include people who cannot see the animation. The latest caption is
 * announced via an aria-live region, and a short log keeps recent activity.
 */
export function Narration({ narration }: NarrationProps) {
  const latest = narration[narration.length - 1] ?? 'Resting.';
  return (
    <section className="narration" aria-label="What Pixie is doing">
      <h2 className="panel-title">Narration</h2>
      <p className="narration__live" aria-live="polite" aria-atomic="true">
        {latest}
      </p>
      <ol className="narration__log">
        {narration.map((caption, i) => (
          <li key={`${i}-${caption}`} className={i === narration.length - 1 ? 'is-latest' : ''}>
            {caption}
          </li>
        ))}
      </ol>
    </section>
  );
}
