/**
 * @vsclaude/contracts
 *
 * The frozen, versioned contracts that every other package and every plugin
 * builds against. This barrel is the entire public surface. If it is not
 * exported here, it is not part of the contract.
 *
 * Build order rule: this package is built and frozen first. Downstream packages
 * import only from here and from already-stable packages, never from each
 * other's internals.
 */
export * from './version.js';
export * from './agent-event.js';
export * from './event-payloads.js';
export * from './provider.js';
export * from './ipc.js';
export * from './motion.js';
export * from './actions.js';
export * from './design-tokens.js';
export * from './plugin-api.js';
export * from './state.js';
