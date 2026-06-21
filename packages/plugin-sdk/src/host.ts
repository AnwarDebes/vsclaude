import type {
  VsclaudePlugin,
  PluginContext,
  PluginManifest,
  Theme,
  PanelDefinition,
  PixieStateDefinition,
  VisualizationDefinition,
  ProviderAdapter,
  Unsubscribe,
} from '@vsclaude/contracts';
import { isPluginCompatible, PLUGIN_API_VERSION } from '@vsclaude/contracts';
import { validateManifest } from './validation.js';

/**
 * Outcome of attempting to register a plugin with the host. A failed
 * registration carries human readable reasons so a host UI or log can
 * explain the rejection.
 */
export type RegistrationResult =
  | { readonly ok: true; readonly handle: PluginHandle }
  | { readonly ok: false; readonly reasons: readonly string[] };

/**
 * A live handle to a plugin that has been activated by the host. Holding
 * the handle lets the caller unload the plugin later without searching
 * the host registries.
 */
export interface PluginHandle {
  readonly manifest: PluginManifest;
  /** True until {@link PluginHost.unload} has run for this plugin. */
  readonly active: boolean;
}

/** Internal bookkeeping for one activated plugin. */
interface PluginRecord {
  readonly plugin: VsclaudePlugin;
  readonly manifest: PluginManifest;
  /** Disposers returned by register* calls, run in reverse on unload. */
  readonly disposers: Unsubscribe[];
  /** Ids this plugin contributed, used to clean the host registries. */
  readonly themeIds: Set<string>;
  readonly panelIds: Set<string>;
  readonly pixieStateIds: Set<string>;
  readonly visualizationIds: Set<string>;
  readonly providerIds: Set<string>;
  active: boolean;
}

/** A registered entry keyed back to its owning plugin id. */
interface OwnedEntry<T> {
  readonly value: T;
  readonly ownerId: string;
}

/**
 * The plugin host. It validates and compatibility checks each plugin,
 * constructs a scoped {@link PluginContext} whose register* methods record
 * contributions into the host registries and hand back disposers, invokes
 * the plugin's `activate`, and supports a clean `unload` that runs
 * `deactivate` and every disposer in reverse order.
 *
 * The host is intentionally dependency free and synchronous where it can
 * be; `activate` and `deactivate` may be async and are awaited.
 */
export class PluginHost {
  /** Maximum apiVersion this host advertises to plugins. */
  readonly apiVersion: number = PLUGIN_API_VERSION;

  private readonly plugins = new Map<string, PluginRecord>();
  private readonly themes = new Map<string, OwnedEntry<Theme>>();
  private readonly panels = new Map<string, OwnedEntry<PanelDefinition>>();
  private readonly pixieStates = new Map<string, OwnedEntry<PixieStateDefinition>>();
  private readonly visualizations = new Map<string, OwnedEntry<VisualizationDefinition>>();
  private readonly providers = new Map<string, OwnedEntry<ProviderAdapter>>();
  private readonly storageMap = new Map<string, unknown>();
  /** A simple in-process log sink, useful for tests and a future plugin console. */
  readonly logs: Array<{ ownerId: string; level: 'info' | 'warn' | 'error'; message: string }> = [];

  /**
   * Validate, compatibility check, and activate a plugin. On success the
   * plugin's contributions are live in the host registries and a handle is
   * returned. On failure nothing is registered and the reasons explain why.
   */
  async register(plugin: VsclaudePlugin): Promise<RegistrationResult> {
    const reasons: string[] = [];

    const manifest = plugin.manifest;
    const validation = validateManifest(manifest);
    if (!validation.ok) {
      for (const err of validation.errors) {
        reasons.push(err.path ? `${err.path}: ${err.message}` : err.message);
      }
      return { ok: false, reasons };
    }

    if (this.plugins.has(manifest.id)) {
      reasons.push(`a plugin with id "${manifest.id}" is already registered`);
      return { ok: false, reasons };
    }

    if (!isPluginCompatible(manifest)) {
      reasons.push(
        `plugin "${manifest.id}" targets apiVersion ${String(manifest.apiVersion)} ` +
          `which is not compatible with host apiVersion ${this.apiVersion}`,
      );
      return { ok: false, reasons };
    }

    const record: PluginRecord = {
      plugin,
      manifest,
      disposers: [],
      themeIds: new Set(),
      panelIds: new Set(),
      pixieStateIds: new Set(),
      visualizationIds: new Set(),
      providerIds: new Set(),
      active: true,
    };

    const context = this.createContext(record);

    try {
      await plugin.activate(context);
    } catch (cause) {
      // Roll back any partial contributions so a failed activate leaves
      // the host exactly as it was before the attempt.
      this.rollback(record);
      const message = cause instanceof Error ? cause.message : String(cause);
      reasons.push(`activate threw: ${message}`);
      return { ok: false, reasons };
    }

    this.plugins.set(manifest.id, record);

    const handle: PluginHandle = {
      manifest,
      get active() {
        return record.active;
      },
    };
    return { ok: true, handle };
  }

  /**
   * Deactivate a plugin and remove all of its contributions. Disposers run
   * in reverse registration order. Returns true if a plugin with that id
   * was active and has now been unloaded, false if it was not registered.
   */
  async unload(pluginId: string): Promise<boolean> {
    const record = this.plugins.get(pluginId);
    if (record === undefined || !record.active) {
      return false;
    }

    record.active = false;

    if (typeof record.plugin.deactivate === 'function') {
      try {
        await record.plugin.deactivate();
      } catch {
        // A throwing deactivate must not prevent registry cleanup.
      }
    }

    // Run disposers in reverse so teardown mirrors construction order.
    for (let i = record.disposers.length - 1; i >= 0; i -= 1) {
      const dispose = record.disposers[i];
      if (dispose !== undefined) {
        try {
          dispose();
        } catch {
          // Ignore individual disposer failures, keep cleaning up.
        }
      }
    }

    this.rollback(record);
    this.plugins.delete(pluginId);
    return true;
  }

  /** Look up a registered theme by id, regardless of which plugin owns it. */
  getTheme(id: string): Theme | undefined {
    return this.themes.get(id)?.value;
  }

  /** Look up a registered panel by id. */
  getPanel(id: string): PanelDefinition | undefined {
    return this.panels.get(id)?.value;
  }

  /** Look up a registered pixie state by id. */
  getPixieState(id: string): PixieStateDefinition | undefined {
    return this.pixieStates.get(id)?.value;
  }

  /** Look up a registered visualization by id. */
  getVisualization(id: string): VisualizationDefinition | undefined {
    return this.visualizations.get(id)?.value;
  }

  /** Look up a registered provider adapter by id. */
  getProvider(id: string): ProviderAdapter | undefined {
    return this.providers.get(id)?.value;
  }

  /** Ids of all themes currently registered across every active plugin. */
  listThemeIds(): readonly string[] {
    return [...this.themes.keys()];
  }

  /** Ids of all currently registered, active plugins. */
  listPluginIds(): readonly string[] {
    return [...this.plugins.keys()];
  }

  /** True if a plugin with the given id is registered and active. */
  hasPlugin(pluginId: string): boolean {
    return this.plugins.get(pluginId)?.active === true;
  }

  /**
   * Build a PluginContext scoped to a single plugin record. Each register*
   * method writes into the shared host registries, tags the entry with the
   * owning plugin id, records a disposer, and returns that disposer so the
   * plugin can also release the contribution itself.
   */
  private createContext(record: PluginRecord): PluginContext {
    const ownerId = record.manifest.id;

    const makeRegister = <T extends { id: string }>(
      registry: Map<string, OwnedEntry<T>>,
      ownedIds: Set<string>,
      kind: string,
    ): ((value: T) => Unsubscribe) => {
      return (value: T): Unsubscribe => {
        if (!record.active) {
          throw new Error(`cannot register ${kind} after plugin "${ownerId}" is unloaded`);
        }
        const id = value.id;
        if (registry.has(id)) {
          throw new Error(`${kind} id "${id}" is already registered`);
        }
        registry.set(id, { value, ownerId });
        ownedIds.add(id);

        let disposed = false;
        const dispose: Unsubscribe = () => {
          if (disposed) {
            return;
          }
          disposed = true;
          const current = registry.get(id);
          if (current !== undefined && current.ownerId === ownerId) {
            registry.delete(id);
          }
          ownedIds.delete(id);
        };
        record.disposers.push(dispose);
        return dispose;
      };
    };

    const storageMap = this.storageMap;
    const logs = this.logs;

    return {
      apiVersion: this.apiVersion,
      registerTheme: makeRegister(this.themes, record.themeIds, 'theme'),
      registerPanel: makeRegister(this.panels, record.panelIds, 'panel'),
      registerPixieState: makeRegister(this.pixieStates, record.pixieStateIds, 'pixieState'),
      registerVisualization: makeRegister(
        this.visualizations,
        record.visualizationIds,
        'visualization',
      ),
      registerProvider: makeRegister(this.providers, record.providerIds, 'provider'),
      storage: {
        get: <T>(key: string): Promise<T | null> => {
          const value = storageMap.get(`${ownerId}:${key}`);
          return Promise.resolve(value === undefined ? null : (value as T));
        },
        set: <T>(key: string, value: T): Promise<void> => {
          storageMap.set(`${ownerId}:${key}`, value);
          return Promise.resolve();
        },
      },
      log: (level: 'info' | 'warn' | 'error', message: string): void => {
        logs.push({ ownerId, level, message });
      },
    };
  }

  /**
   * Remove every contribution still owned by a plugin record from the host
   * registries. Safe to call on a partially registered record (used both
   * by unload and by failed activate rollback).
   */
  private rollback(record: PluginRecord): void {
    const sweep = <T>(registry: Map<string, OwnedEntry<T>>, ids: Set<string>): void => {
      for (const id of ids) {
        const entry = registry.get(id);
        if (entry !== undefined && entry.ownerId === record.manifest.id) {
          registry.delete(id);
        }
      }
      ids.clear();
    };
    sweep(this.themes, record.themeIds);
    sweep(this.panels, record.panelIds);
    sweep(this.pixieStates, record.pixieStateIds);
    sweep(this.visualizations, record.visualizationIds);
    sweep(this.providers, record.providerIds);
  }
}
