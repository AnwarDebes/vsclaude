/**
 * @vsclaude/plugin-sdk
 *
 * The plugin host for the vsclaude IDE. This package owns the runtime that
 * loads third party and first party plugins: it validates manifests, checks
 * api compatibility, builds the scoped context that plugins register their
 * contributions through, and manages the activate and unload lifecycle.
 *
 * This is the initial pure-TypeScript logic layer. The React and native
 * integration surfaces are tracked in ROADMAP.md.
 */

export { validateManifest, isValidManifest } from './validation.js';
export type { ValidationError, ValidationResult } from './validation.js';

export { PluginHost } from './host.js';
export type { RegistrationResult, PluginHandle } from './host.js';

export { definePlugin } from './define.js';
