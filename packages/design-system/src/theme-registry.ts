/**
 * A small in-memory registry of themes. It seeds itself from the bundled
 * {@link THEMES} from `@vsclaude/contracts` and lets the host register
 * additional themes at runtime (for example from a plugin contribution).
 */
import type { Theme } from '@vsclaude/contracts';
import { THEMES, DEFAULT_THEME_ID } from '@vsclaude/contracts';

/**
 * Registry of available themes keyed by their stable id.
 *
 * The registry is intentionally tiny and dependency free so it can run in any
 * environment (main process, renderer, worker, or test). It never mutates the
 * frozen contracts data: bundled themes are copied into its internal map.
 */
export class ThemeRegistry {
  private readonly themes = new Map<string, Theme>();
  private defaultId: string;

  /**
   * Construct a registry. By default it is seeded with every theme exported
   * from the contracts package. Pass `seed: false` to start empty.
   */
  constructor(options?: { seed?: boolean; defaultId?: string }) {
    const seed = options?.seed ?? true;
    if (seed) {
      for (const theme of Object.values(THEMES)) {
        this.themes.set(theme.id, theme);
      }
    }
    this.defaultId = options?.defaultId ?? DEFAULT_THEME_ID;
  }

  /**
   * Register or overwrite a theme. Returns the registry for chaining. The most
   * recently registered theme with a given id wins.
   */
  register(theme: Theme): this {
    this.themes.set(theme.id, theme);
    return this;
  }

  /** Whether a theme with the given id is registered. */
  has(id: string): boolean {
    return this.themes.has(id);
  }

  /** Look up a theme by id. Returns undefined when it is not registered. */
  get(id: string): Theme | undefined {
    return this.themes.get(id);
  }

  /**
   * List all registered themes. The order is stable: the configured default
   * theme comes first, then the remaining themes sorted by id.
   */
  list(): Theme[] {
    const all = Array.from(this.themes.values());
    all.sort((a, b) => {
      if (a.id === this.defaultId) return -1;
      if (b.id === this.defaultId) return 1;
      return a.id.localeCompare(b.id);
    });
    return all;
  }

  /** The list of registered theme ids, in the same order as {@link list}. */
  ids(): string[] {
    return this.list().map((theme) => theme.id);
  }

  /**
   * Get the default theme. Falls back to the first registered theme when the
   * configured default id is not present, and throws only when the registry is
   * completely empty.
   */
  getDefault(): Theme {
    const preferred = this.themes.get(this.defaultId);
    if (preferred) {
      return preferred;
    }
    const first = this.list()[0];
    if (!first) {
      throw new Error('ThemeRegistry is empty: no default theme available.');
    }
    return first;
  }

  /**
   * Change which id is treated as the default. The id must already be
   * registered, otherwise this throws so the caller fails loudly.
   */
  setDefault(id: string): this {
    if (!this.themes.has(id)) {
      throw new Error(`Cannot set default theme: "${id}" is not registered.`);
    }
    this.defaultId = id;
    return this;
  }

  /** The number of registered themes. */
  get size(): number {
    return this.themes.size;
  }
}
