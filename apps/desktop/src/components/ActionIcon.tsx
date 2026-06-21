import type { CSSProperties } from 'react';
// The sprite holds one <symbol id="act-{id}"> per agent action, each rendering
// Pixie performing that action. Generated from the banner by
// scripts/gen-action-icons.mjs. Imported raw and injected once by the sprite.
import actionSprite from '../assets/pixie-actions.svg?raw';

/**
 * Inject the action icon sprite into the document exactly once. Render this near
 * the root of the app. Every {@link ActionIcon} references symbols from it.
 */
export function PixieActionSprite() {
  return (
    <div aria-hidden style={{ display: 'none' }} dangerouslySetInnerHTML={{ __html: actionSprite }} />
  );
}

interface ActionIconProps {
  /** The action id, for example `commit`, `search`, `deploy`. */
  id: string;
  /** Pixel size of the square icon. */
  size?: number;
  /** Accessible label. Defaults to the action id. */
  label?: string;
}

const crisp: CSSProperties = { shapeRendering: 'crispEdges' };

/**
 * Render Pixie performing a given action. Pulls the matching symbol from the
 * injected sprite, so it is the exact pixel art from the banner.
 */
export function ActionIcon({ id, size = 28, label }: ActionIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      role="img"
      aria-label={label ?? id}
      style={crisp}
    >
      <use href={`#act-${id}`} />
    </svg>
  );
}
