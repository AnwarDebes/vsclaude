# @vsclaude/design-system

The design system layer for the vsclaude IDE. It takes the typed design tokens that live in `@vsclaude/contracts` and turns them into runtime CSS custom properties, keeps a small registry of available themes, and resolves the right theme for a given set of user accessibility preferences. The package is pure TypeScript with zero UI dependencies, so it runs unchanged in the main process, the renderer, a worker, or a test.

## What lives here

- `themeToCssVariables(theme)` and `themeToCssText(theme, selector?)`: convert a `Theme` into a flat map of CSS custom properties (`--color-accent`, `--space-*`, `--radius-*`, `--font-*`, `--motion-*`, `--z-*`) or into a ready to inject `:root { ... }` rule. Color variable names come from `colorVar` in the contracts package so they line up with every other consumer.
- `ThemeRegistry`: an in-memory registry seeded from the bundled `THEMES`. Supports `register`, `get`, `has`, `list`, `ids`, `getDefault`, and `setDefault`.
- `resolveThemeForSettings(themeId, prefs)`: picks the concrete theme to apply, honouring `colorBlindSafe` and `reducedMotion` accessibility preferences. Companion helpers `resolveThemeById` and `bundledThemeIds` are also exported.

## Usage

```ts
import {
  ThemeRegistry,
  resolveThemeForSettings,
  themeToCssText,
} from '@vsclaude/design-system';

const registry = new ThemeRegistry();

// Resolve the theme for a user's saved settings.
const theme = resolveThemeForSettings('dark', {
  reducedMotion: false,
  colorBlindSafe: false,
});

// Generate the CSS to inject into the document.
const css = themeToCssText(theme);
// css === ':root {\n  --color-accent: ...;\n  ...\n}'

console.log(registry.ids()); // every bundled theme id, default first
```

## Status

This is the initial logic layer: pure token-to-CSS conversion, the theme registry, and theme resolution. The React provider and any native or Tailwind preset integration are tracked in [ROADMAP.md](./ROADMAP.md) and arrive in a later layer.
