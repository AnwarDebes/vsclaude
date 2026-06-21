import { describe, it, expect, vi } from 'vitest';
import type { VsclaudePlugin, Theme, PluginContext } from '@vsclaude/contracts';
import { PLUGIN_API_VERSION, darkTheme } from '@vsclaude/contracts';
import { validateManifest, isValidManifest } from '../validation.js';
import { PluginHost } from '../host.js';
import { definePlugin } from '../define.js';

/** Build a minimal theme with a custom id for registration tests. */
function makeTheme(id: string): Theme {
  return { ...darkTheme, id, name: `Theme ${id}` };
}

describe('validateManifest', () => {
  it('accepts a well formed manifest', () => {
    const result = validateManifest({
      id: 'acme.theme',
      name: 'Acme Theme',
      version: '1.0.0',
      apiVersion: PLUGIN_API_VERSION,
    });
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects a missing id and a non-numeric apiVersion together', () => {
    const result = validateManifest({
      name: 'No Id',
      version: '1.0.0',
      apiVersion: '1',
    });
    expect(result.ok).toBe(false);
    const paths = result.errors.map((e) => e.path);
    expect(paths).toContain('id');
    expect(paths).toContain('apiVersion');
  });

  it('rejects a non-object and reports a malformed contributes field', () => {
    expect(validateManifest(null).ok).toBe(false);
    const bad = validateManifest({
      id: 'x',
      name: 'X',
      version: '1.0.0',
      apiVersion: 1,
      contributes: { themes: 'not-an-array' },
    });
    expect(bad.ok).toBe(false);
    expect(bad.errors.map((e) => e.path)).toContain('contributes.themes');
  });

  it('isValidManifest narrows valid input', () => {
    expect(isValidManifest({ id: 'a', name: 'A', version: '1', apiVersion: 1 })).toBe(true);
    expect(isValidManifest({ id: 'a' })).toBe(false);
  });
});

describe('PluginHost', () => {
  it('rejects an incompatible plugin without registering anything', async () => {
    const host = new PluginHost();
    const activate = vi.fn();
    const plugin = definePlugin({
      manifest: {
        id: 'future.plugin',
        name: 'Future Plugin',
        version: '9.9.9',
        apiVersion: PLUGIN_API_VERSION + 1000,
      },
      activate,
    });

    const result = await host.register(plugin);
    expect(result.ok).toBe(false);
    expect(activate).not.toHaveBeenCalled();
    expect(host.listPluginIds()).toHaveLength(0);
    if (!result.ok) {
      expect(result.reasons.join(' ')).toContain('apiVersion');
    }
  });

  it('activates a plugin and exposes its registered theme, then disposes on unload', async () => {
    const host = new PluginHost();
    const theme = makeTheme('acme.midnight');
    const deactivate = vi.fn();

    const plugin: VsclaudePlugin = definePlugin({
      manifest: {
        id: 'acme.theme',
        name: 'Acme Theme',
        version: '1.0.0',
        apiVersion: PLUGIN_API_VERSION,
      },
      activate(ctx: PluginContext) {
        ctx.registerTheme(theme);
      },
      deactivate,
    });

    const result = await host.register(plugin);
    expect(result.ok).toBe(true);
    expect(host.getTheme('acme.midnight')).toEqual(theme);
    expect(host.hasPlugin('acme.theme')).toBe(true);

    const unloaded = await host.unload('acme.theme');
    expect(unloaded).toBe(true);
    expect(deactivate).toHaveBeenCalledTimes(1);
    expect(host.getTheme('acme.midnight')).toBeUndefined();
    expect(host.hasPlugin('acme.theme')).toBe(false);
  });

  it('returns disposers that release a single contribution and run idempotently', async () => {
    const host = new PluginHost();
    let dispose: (() => void) | undefined;

    const plugin = definePlugin({
      manifest: { id: 'p.disp', name: 'Disp', version: '1', apiVersion: PLUGIN_API_VERSION },
      activate(ctx) {
        dispose = ctx.registerTheme(makeTheme('p.one'));
        ctx.registerTheme(makeTheme('p.two'));
      },
    });

    await host.register(plugin);
    expect(host.listThemeIds().sort()).toEqual(['p.one', 'p.two']);

    dispose?.();
    dispose?.(); // second call must be a no-op
    expect(host.getTheme('p.one')).toBeUndefined();
    expect(host.getTheme('p.two')).toEqual(makeTheme('p.two'));
  });

  it('rolls back contributions when activate throws', async () => {
    const host = new PluginHost();
    const plugin = definePlugin({
      manifest: { id: 'p.boom', name: 'Boom', version: '1', apiVersion: PLUGIN_API_VERSION },
      activate(ctx) {
        ctx.registerTheme(makeTheme('p.ghost'));
        throw new Error('activation failed');
      },
    });

    const result = await host.register(plugin);
    expect(result.ok).toBe(false);
    expect(host.getTheme('p.ghost')).toBeUndefined();
    expect(host.hasPlugin('p.boom')).toBe(false);
  });

  it('rejects duplicate plugin ids', async () => {
    const host = new PluginHost();
    const make = (): VsclaudePlugin =>
      definePlugin({
        manifest: { id: 'dup', name: 'Dup', version: '1', apiVersion: PLUGIN_API_VERSION },
        activate() {
          /* no contributions */
        },
      });

    expect((await host.register(make())).ok).toBe(true);
    const second = await host.register(make());
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.reasons.join(' ')).toContain('already registered');
    }
  });
});
