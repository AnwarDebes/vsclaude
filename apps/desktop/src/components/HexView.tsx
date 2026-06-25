import { useEffect } from 'react';
import { hexDumpBytes } from '../lib/hex';

export interface HexTarget {
  name: string;
  bytes: Uint8Array;
}

export interface HexViewProps {
  target: HexTarget | null;
  onClose: () => void;
}

/** A read-only hex dump of the active file. Escape closes it. */
export function HexView({ target, onClose }: HexViewProps) {
  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, onClose]);

  if (!target) return null;

  return (
    <div className="hex-overlay" role="dialog" aria-label={`Hex view of ${target.name}`} onClick={onClose}>
      <div className="hex-modal" onClick={(e) => e.stopPropagation()}>
        <header className="hex-modal__header">
          <h2 className="hex-modal__title">{target.name} (hex)</h2>
          <button type="button" className="btn btn--ghost" aria-label="Close hex view" onClick={onClose}>
            Close
          </button>
        </header>
        <pre className="hex-modal__body">{hexDumpBytes(target.bytes)}</pre>
      </div>
    </div>
  );
}
