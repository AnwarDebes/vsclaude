import { useRef } from 'react';
import { clampSize } from '../lib/sash';

export interface SashProps {
  /**
   * 'vertical' resizes a width (the splitter line is vertical, on a panel's right
   * edge; drag right / ArrowRight grows it). 'horizontal' resizes a height (the line
   * is horizontal, on a panel's top edge; drag up / ArrowUp grows it).
   */
  orientation: 'vertical' | 'horizontal';
  /** Current size (px) of the panel this sash resizes. */
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  ariaLabel: string;
  /** Keyboard resize step in px. */
  step?: number;
  className?: string;
}

/**
 * A draggable, keyboard-operable splitter (VS Code calls it a sash). Pointer drag or
 * Arrow keys resize the adjacent panel; it reports the new size via onChange and the
 * caller feeds it back through `value`. Exposed as an ARIA separator so assistive tech
 * and tests can drive it without a mouse.
 */
export function Sash({ orientation, value, min, max, onChange, ariaLabel, step = 16, className }: SashProps) {
  const dragRef = useRef<{ start: number; startValue: number } | null>(null);
  const vertical = orientation === 'vertical';
  const clamp = (n: number) => clampSize(n, min, max);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragRef.current = { start: vertical ? event.clientX : event.clientY, startValue: value };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    // Vertical sash grows rightward; horizontal sash (top edge) grows upward.
    const delta = vertical ? event.clientX - drag.start : drag.start - event.clientY;
    onChange(clamp(drag.startValue + delta));
  };
  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const grow = vertical ? 'ArrowRight' : 'ArrowUp';
    const shrink = vertical ? 'ArrowLeft' : 'ArrowDown';
    if (event.key === grow) {
      event.preventDefault();
      onChange(clamp(value + step));
    } else if (event.key === shrink) {
      event.preventDefault();
      onChange(clamp(value - step));
    } else if (event.key === 'Home') {
      event.preventDefault();
      onChange(min);
    } else if (event.key === 'End') {
      event.preventDefault();
      onChange(max);
    }
  };

  return (
    <div
      className={`sash sash--${orientation}${className ? ` ${className}` : ''}`}
      role="separator"
      aria-orientation={orientation}
      aria-label={ariaLabel}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={onKeyDown}
    />
  );
}
