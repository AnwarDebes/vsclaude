/**
 * The public plugin API surface.
 *
 * This is how the community extends vsclaude: new Pixie states and companions,
 * themes, visualizations, providers, and panels. Everything a plugin needs is
 * re-exported from this package so a plugin only ever depends on
 * `@vsclaude/contracts`, never on internal packages.
 */
import type { Theme } from './design-tokens.js';
import type { PixieState } from './motion.js';
import type { ProviderAdapter } from './provider.js';
import { PLUGIN_API_VERSION } from './version.js';

/** What a plugin contributes, declared up front for discovery and trust. */
export interface PluginContributions {
  pixieStates?: string[];
  themes?: string[];
  panels?: string[];
  providers?: string[];
  visualizations?: string[];
}

/** A plugin's manifest, shipped in its package.json under the `vsclaude` key. */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  /** The plugin API version this plugin targets. Must match the host major. */
  apiVersion: number;
  author?: string;
  description?: string;
  /** A pixel-art icon, as a path relative to the plugin root. */
  icon?: string;
  contributes?: PluginContributions;
}

/** Definition for a custom Pixie state contributed by a plugin. */
export interface PixieStateDefinition {
  /** Unique state id, namespaced by the plugin, for example `acme.celebrating`. */
  id: string;
  /** The base built-in state to blend from while assets load. */
  basedOn: PixieState;
  /** Rive artboard or sprite-sheet asset path. */
  asset: string;
  /** Default caption template. */
  caption?: string;
}

/** Definition for a custom panel contributed by a plugin. */
export interface PanelDefinition {
  id: string;
  title: string;
  /** Where the panel prefers to dock. */
  location: 'left' | 'right' | 'bottom' | 'center';
  /** The React component is resolved by the host via this entry id. */
  component: string;
}

/** Definition for a custom visualization (for example a different swarm layout). */
export interface VisualizationDefinition {
  id: string;
  title: string;
  component: string;
}

/**
 * The host context handed to a plugin on activation. A plugin registers its
 * contributions through these calls. Each register call returns a disposer.
 */
export interface PluginContext {
  readonly apiVersion: number;
  registerTheme(theme: Theme): () => void;
  registerPixieState(def: PixieStateDefinition): () => void;
  registerPanel(def: PanelDefinition): () => void;
  registerProvider(adapter: ProviderAdapter): () => void;
  registerVisualization(def: VisualizationDefinition): () => void;
  /** Read and write plugin-scoped persistent storage. */
  storage: {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
  };
  /** Structured logging that surfaces in the plugin console. */
  log(level: 'info' | 'warn' | 'error', message: string): void;
}

/** The shape every plugin module default-exports. */
export interface VsclaudePlugin {
  manifest: PluginManifest;
  activate(ctx: PluginContext): void | Promise<void>;
  deactivate?(): void | Promise<void>;
}

/** True when a plugin's declared API version is compatible with this host. */
export function isPluginCompatible(manifest: PluginManifest): boolean {
  return manifest.apiVersion === PLUGIN_API_VERSION;
}

export { PLUGIN_API_VERSION };
