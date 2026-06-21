import { AGENT_ACTION_BY_ID } from '@vsclaude/contracts';
import { ActionIcon } from './ActionIcon';

interface PixieStageProps {
  /** The resolved action id, for example `commit`, `search`, `deploy`. */
  actionId: string;
  caption?: string;
  /** Plain-language label for the state, shown for accessibility and clarity. */
  stateLabel: string;
  /** Pixel size of the Pixie. Smaller for the companion corner. */
  size?: number;
}

/**
 * The stage shows Pixie performing the current action, drawn from the same pixel
 * art as the banner (one icon per action). The caption always accompanies it so
 * anyone, technical or not, can follow along (sacred rule 3).
 */
export function PixieStage({ actionId, caption, stateLabel, size = 184 }: PixieStageProps) {
  const action = AGENT_ACTION_BY_ID[actionId];
  return (
    <section className="pixie-stage" aria-label="Pixie, your coding companion">
      <div className="pixie-scene">
        <ActionIcon id={actionId} size={size} label={`Pixie is ${action?.caption ?? stateLabel}`} />
      </div>
      <div className="pixie-caption" aria-live="polite">
        <span className="pixie-caption__state">{action ? action.label : stateLabel}</span>
        {caption ? <span className="pixie-caption__text">{caption}</span> : null}
      </div>
    </section>
  );
}
