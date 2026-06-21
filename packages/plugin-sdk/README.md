# @vsclaude/plugin-sdk

The plugin host for the vsclaude IDE. It turns a `VsclaudePlugin` object into a live, managed extension: it validates the plugin manifest, checks that the plugin targets a compatible plugin api version, builds a scoped `PluginContext` whose `register*` methods record contributions and hand back disposers, runs the plugin's `activate`, and supports a clean `unload` that runs `deactivate` and reverses every contribution. All of the logic here is pure TypeScript and depends only on the frozen `@vsclaude/contracts` surface.

## What lives here

- `validateManifest(candidate)` / `isValidManifest(candidate)`: collect every problem in a candidate manifest (required `id`, `name`, `version`, a numeric `apiVersion`, and well shaped `contributes` arrays) without throwing.
- `PluginHost`: registers and unloads plugins, tracks contributed themes, panels, pixie states, visualizations, and providers in id keyed registries, and rolls back cleanly when `activate` fails.
- `definePlugin(plugin)`: an identity helper that gives plugin authors precise type checking at the definition site.

## Usage

```ts
import { PluginHost, definePlugin } from '@vsclaude/plugin-sdk';
import { darkTheme, PLUGIN_API_VERSION } from '@vsclaude/contracts';

const myPlugin = definePlugin({
  manifest: {
    id: 'acme.midnight',
    name: 'Acme Midnight Theme',
    version: '1.0.0',
    apiVersion: PLUGIN_API_VERSION,
  },
  activate(ctx) {
    ctx.registerTheme({ ...darkTheme, id: 'acme.midnight', name: 'Acme Midnight' });
  },
  deactivate() {
    // release any external resources here
  },
});

const host = new PluginHost();
const result = await host.register(myPlugin);

if (result.ok) {
  const theme = host.getTheme('acme.midnight'); // the registered theme
  // ...later
  await host.unload('acme.midnight'); // runs deactivate, disposes the theme
} else {
  console.warn('plugin rejected:', result.reasons.join('; '));
}
```

## Status

This is the initial logic layer: manifest validation, compatibility checks, and the registration and unload lifecycle, all covered by Vitest. The React and native integration (rendering registered panels and visualizations, surfacing plugin themes in the running app) is tracked in [ROADMAP.md](./ROADMAP.md).
