import type { PixieState } from '@vsclaude/contracts';

interface PixieStageProps {
  state: PixieState;
  caption?: string;
  /** Plain-language label for the state, shown for accessibility and clarity. */
  stateLabel: string;
}

/**
 * A small pixel-art companion rendered in pure CSS for the demo. The production
 * Pixie is a Rive state machine in `@vsclaude/motion`; this placeholder proves
 * the binding from real events to a visible, captioned performance.
 *
 * Sacred rule 3: the caption always accompanies the motion so anyone, technical
 * or not, can follow along.
 */
export function PixieStage({ state, caption, stateLabel }: PixieStageProps) {
  return (
    <section className="pixie-stage" aria-label="Pixie, your coding companion">
      <div className="pixie-scene">
        <div className={`pixie pixie--${state}`} data-state={state} role="img" aria-label={`Pixie is ${stateLabel}`}>
          <span className="pixie__antenna pixie__antenna--left" />
          <span className="pixie__antenna pixie__antenna--right" />
          <span className="pixie__head">
            <span className="pixie__eye pixie__eye--left" />
            <span className="pixie__eye pixie__eye--right" />
            <span className="pixie__mouth" />
          </span>
          <span className="pixie__body" />
        </div>
      </div>
      <div className="pixie-caption" aria-live="polite">
        <span className="pixie-caption__state">{stateLabel}</span>
        {caption ? <span className="pixie-caption__text">{caption}</span> : null}
      </div>
    </section>
  );
}
