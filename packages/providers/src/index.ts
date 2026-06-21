/**
 * @vsclaude/providers
 *
 * The provider layer for vsclaude. It owns two responsibilities at this stage:
 *
 *  1. {@link ProviderRegistry}: a tiny synchronous registry that maps provider
 *     ids to {@link import('@vsclaude/contracts').ProviderAdapter} instances so
 *     the app can discover and open agent sessions.
 *  2. {@link parseClaudeStreamLine}: a pure function that converts a single line
 *     of Claude Code stream-json (NDJSON) into a normalized
 *     {@link import('@vsclaude/contracts').AgentEvent}.
 *
 * Everything here is dependency free pure TypeScript so it can run in Node, the
 * browser, or a worker. Heavier provider transports plug in later through the
 * adapter interface from the contracts package.
 */

export { createCounter, makeEventId } from './ids.js';
export type { Counter } from './ids.js';

export {
  ProviderRegistry,
  createProviderRegistry,
  DuplicateProviderError,
} from './registry.js';

export { parseClaudeStreamLine } from './claude-stream.js';
export type { ClaudeParseContext } from './claude-stream.js';
