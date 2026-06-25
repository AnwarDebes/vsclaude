import { useRef } from 'react';
import { clampSize } from '../lib/sash';

export interface SashProps {
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
export function Sash({ value, min, max, onChange, ariaLabel, step = 16, className }: SashProps) {
  const dragRef = useRef<{ startX: number; startValue: number } | null>(null);
  const clamp = (n: number) => clampSize(n, min, max);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragRef.current = { startX: event.clientX, startValue: value };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    onChange(clamp(drag.startValue + (event.clientX - drag.startX)));
  };
  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onChange(clamp(value - step));
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      onChange(clamp(value + step));
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
      className={`sash${className ? ` ${className}` : ''}`}
      role="separator"
      aria-orientation="vertical"
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
