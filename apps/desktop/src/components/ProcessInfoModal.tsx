import { useEffect, useState } from 'react';
import { collectProcessInfo, formatBytes, type ProcessInfoSnapshot } from '../lib/process-info';

export interface ProcessInfoModalProps {
  open: boolean;
  onClose: () => void;
}

function heap(value: number | undefined): string {
  return value === undefined ? 'unavailable' : formatBytes(value);
}

/** A small process-info panel: JS heap, CPU cores, DOM nodes, and the protocol version. */
export function ProcessInfoModal({ open, onClose }: ProcessInfoModalProps) {
  const [info, setInfo] = useState<ProcessInfoSnapshot | null>(null);

  useEffect(() => {
    if (!open) return;
    setInfo(collectProcessInfo());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !info) return null;

  const rows: Array<[string, string]> = [
    ['Heap used', heap(info.heapUsed)],
    ['Heap total', heap(info.heapTotal)],
    ['Heap limit', heap(info.heapLimit)],
    ['CPU cores', String(info.cpuCores)],
    ['DOM nodes', String(info.domNodes)],
    ['IPC protocol', `v${info.protocolVersion}`],
  ];

  return (
    <div className="proc-overlay" role="dialog" aria-label="Process info" onClick={onClose}>
      <div className="proc-modal" onClick={(e) => e.stopPropagation()}>
        <header className="proc-modal__header">
          <h2 className="proc-modal__title">Process Info</h2>
          <button
            type="button"
            className="proc-modal__action"
            onClick={() => setInfo(collectProcessInfo())}
          >
            Refresh
          </button>
          <button type="button" className="btn btn--ghost" aria-label="Close process info" onClick={onClose}>
            Close
          </button>
        </header>
        <dl className="proc-modal__grid">
          {rows.map(([label, value]) => (
            <div className="proc-modal__row" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
