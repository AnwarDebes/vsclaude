/**
 * Persisted layout state shared between App.tsx and its tests. The bottom-panel
 * selection is restored across a reload, so the saved string is validated against
 * the known panels (an unknown or absent value falls back to 'none'). Kept pure so
 * the validation is unit tested without a DOM.
 */
export const BOTTOM_PANELS = [
  'none',
  'problems',
  'search',
  'scm',
  'output',
  'outline',
  'narration',
] as const;

export type BottomPanel = (typeof BOTTOM_PANELS)[number];

/** A panel that can be restored by Toggle Panel, i.e. any panel except 'none'. */
export type RestorablePanel = Exclude<BottomPanel, 'none'>;

export function parseBottomPanel(saved: string | null): BottomPanel {
  return saved !== null && (BOTTOM_PANELS as readonly string[]).includes(saved)
    ? (saved as BottomPanel)
    : 'none';
}
