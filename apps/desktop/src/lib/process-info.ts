import { IPC_PROTOCOL_VERSION } from '@vsclaude/contracts';

/** Format a byte count into a short human-readable size. Pure, so it is unit tested. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return 'n/a';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

export interface ProcessInfoSnapshot {
  cpuCores: number;
  domNodes: number;
  heapUsed?: number;
  heapTotal?: number;
  heapLimit?: number;
  protocolVersion: number;
  userAgent: string;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

/**
 * Read a snapshot of runtime metrics: JS heap (where the engine exposes it), CPU
 * cores, live DOM node count, the IPC protocol version, and the user agent. The
 * heap fields are Chromium-only, so they are optional.
 */
export function collectProcessInfo(): ProcessInfoSnapshot {
  const memory = (performance as Performance & { memory?: MemoryInfo }).memory;
  return {
    cpuCores: navigator.hardwareConcurrency || 0,
    domNodes: document.getElementsByTagName('*').length,
    heapUsed: memory?.usedJSHeapSize,
    heapTotal: memory?.totalJSHeapSize,
    heapLimit: memory?.jsHeapSizeLimit,
    protocolVersion: IPC_PROTOCOL_VERSION,
    userAgent: navigator.userAgent,
  };
}
