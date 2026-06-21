/**
 * @vsclaude/persistence
 *
 * Initial logic layer for persisting vsclaude state:
 *
 * - Session serialization and strict, contract-validated parsing.
 * - Settings load and save that deep-merge user overrides over the
 *   frozen defaults from `@vsclaude/contracts`.
 * - A {@link SecretStore} interface plus an in-memory implementation for
 *   tests and early development, ahead of the native OS keychain bridge.
 *
 * Everything here is pure TypeScript with no native or UI dependencies,
 * so it is safe to import from both the main and renderer processes.
 */

export { PersistenceError, SchemaVersionError } from './errors.js';

export {
  serializeSession,
  parseSession,
  validateSession,
} from './session.js';

export {
  mergeSettings,
  serializeSettings,
  loadSettings,
  type DeepPartial,
} from './settings.js';

export {
  type SecretStore,
  InMemorySecretStore,
} from './secrets.js';

export {
  isRecord,
  isFiniteNumber,
  isNonEmptyString,
} from './guards.js';
