import type { ProviderAdapter, ProviderId } from '@vsclaude/contracts';

/**
 * Error thrown when an adapter is registered under an id that is already taken.
 *
 * Re-registration is treated as a programming error rather than silently
 * overwriting, because two adapters claiming the same provider id almost always
 * indicates a wiring mistake.
 */
export class DuplicateProviderError extends Error {
  /** The conflicting provider id. */
  readonly providerId: ProviderId;

  constructor(providerId: ProviderId) {
    super(`A provider adapter is already registered for id "${providerId}".`);
    this.name = 'DuplicateProviderError';
    this.providerId = providerId;
  }
}

/**
 * In memory registry of {@link ProviderAdapter} instances keyed by provider id.
 *
 * The registry is the single source of truth the application uses to discover
 * which agent backends are available (Claude Code, mock providers, future
 * adapters). It is deliberately tiny and synchronous: registration happens at
 * startup, and lookups happen on the hot path of opening a session.
 */
export class ProviderRegistry {
  readonly #adapters = new Map<ProviderId, ProviderAdapter>();

  /**
   * Registers an adapter.
   *
   * @param adapter - The adapter to register. Its `id` is used as the key.
   * @throws {DuplicateProviderError} If an adapter with the same id exists.
   * @returns The registry, to allow fluent chaining.
   */
  register(adapter: ProviderAdapter): this {
    if (this.#adapters.has(adapter.id)) {
      throw new DuplicateProviderError(adapter.id);
    }
    this.#adapters.set(adapter.id, adapter);
    return this;
  }

  /**
   * Registers an adapter, replacing any existing one with the same id.
   *
   * Useful in tests and hot reload scenarios where overwriting is intentional.
   *
   * @param adapter - The adapter to register or replace.
   * @returns The previous adapter for that id, if any.
   */
  upsert(adapter: ProviderAdapter): ProviderAdapter | undefined {
    const previous = this.#adapters.get(adapter.id);
    this.#adapters.set(adapter.id, adapter);
    return previous;
  }

  /**
   * Looks up an adapter by id.
   *
   * @param id - The provider id to resolve.
   * @returns The adapter, or `undefined` if none is registered.
   */
  get(id: ProviderId): ProviderAdapter | undefined {
    return this.#adapters.get(id);
  }

  /**
   * Returns whether an adapter is registered for the given id.
   *
   * @param id - The provider id to test.
   */
  has(id: ProviderId): boolean {
    return this.#adapters.has(id);
  }

  /**
   * Removes the adapter registered under the given id.
   *
   * @param id - The provider id to remove.
   * @returns `true` if an adapter was removed, `false` if none existed.
   */
  unregister(id: ProviderId): boolean {
    return this.#adapters.delete(id);
  }

  /**
   * Lists all registered adapters in registration order.
   *
   * The returned array is a fresh copy, so callers may sort or filter it
   * without mutating registry state.
   */
  list(): ProviderAdapter[] {
    return [...this.#adapters.values()];
  }

  /**
   * Lists all registered provider ids in registration order.
   */
  ids(): ProviderId[] {
    return [...this.#adapters.keys()];
  }

  /** The number of registered adapters. */
  get size(): number {
    return this.#adapters.size;
  }
}

/**
 * Convenience factory that returns a fresh, empty {@link ProviderRegistry}.
 */
export function createProviderRegistry(): ProviderRegistry {
  return new ProviderRegistry();
}
