/**
 * Secret storage abstraction.
 *
 * Sensitive values (provider API keys, OAuth refresh tokens) must never
 * live in plain session or settings files. {@link SecretStore} defines a
 * minimal async contract for reading and writing those secrets, scoped
 * by a string key (for example `provider:anthropic:apiKey`).
 *
 * The production implementation will bind to the host OS keychain
 * (Keychain on macOS, Credential Manager on Windows, libsecret on
 * Linux) over IPC from the renderer to the privileged main process. That
 * implementation is not part of this pure-logic layer because it needs
 * native bindings. {@link InMemorySecretStore} provides a fully working,
 * dependency-free implementation suitable for tests and for early
 * development before the native bridge lands.
 */

/**
 * Async key/value contract for storing secrets out of band from regular
 * persisted documents. All methods are asynchronous because the real
 * backing store crosses an IPC boundary to the OS keychain.
 */
export interface SecretStore {
  /**
   * Store (or overwrite) the secret value for `key`.
   */
  set(key: string, value: string): Promise<void>;

  /**
   * Retrieve the secret for `key`, or `undefined` when no secret is
   * stored under that key.
   */
  get(key: string): Promise<string | undefined>;

  /**
   * Delete the secret for `key`. Resolves to `true` when a value was
   * actually removed and `false` when there was nothing to remove.
   */
  delete(key: string): Promise<boolean>;
}

/** Reject empty keys early: an empty key almost always signals a bug. */
function assertKey(key: string): void {
  if (typeof key !== 'string' || key.length === 0) {
    throw new Error('Secret key must be a non-empty string');
  }
}

/**
 * In-memory {@link SecretStore} implementation.
 *
 * Values live only for the lifetime of the process. This is the right
 * backend for unit tests and for local development before the native
 * keychain bridge is wired up. Do not use it in production: secrets are
 * not encrypted and do not survive a restart.
 */
export class InMemorySecretStore implements SecretStore {
  readonly #store = new Map<string, string>();

  /**
   * @param seed Optional initial entries, handy for seeding test
   *   fixtures.
   */
  constructor(seed?: Readonly<Record<string, string>>) {
    if (seed) {
      for (const [key, value] of Object.entries(seed)) {
        assertKey(key);
        this.#store.set(key, value);
      }
    }
  }

  async set(key: string, value: string): Promise<void> {
    assertKey(key);
    if (typeof value !== 'string') {
      throw new Error('Secret value must be a string');
    }
    this.#store.set(key, value);
  }

  async get(key: string): Promise<string | undefined> {
    assertKey(key);
    return this.#store.get(key);
  }

  async delete(key: string): Promise<boolean> {
    assertKey(key);
    return this.#store.delete(key);
  }

  /**
   * Number of secrets currently held. Exposed for tests and diagnostics;
   * not part of the {@link SecretStore} contract.
   */
  get size(): number {
    return this.#store.size;
  }

  /**
   * Whether a secret exists for `key`. Convenience for tests; not part
   * of the {@link SecretStore} contract.
   */
  has(key: string): boolean {
    assertKey(key);
    return this.#store.has(key);
  }
}
