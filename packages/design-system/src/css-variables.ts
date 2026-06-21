/**
 * Conversion of {@link Theme} design tokens into CSS custom properties.
 *
 * The functions here are pure and deterministic: given the same theme they
 * always produce the same variable map and text. They are the bridge between
 * the typed token model in `@vsclaude/contracts` and the runtime CSS that the
 * IDE shell injects into its document.
 */
import type {
  Theme,
  ColorTokens,
  SpaceTokens,
  RadiusTokens,
  FontTokens,
  MotionTokens,
  ZIndexTokens,
} from '@vsclaude/contracts';
import { colorVar, tokensForTheme } from '@vsclaude/contracts';

/**
 * Convert a camelCase or single token key into a kebab-case CSS variable
 * fragment. For example `editorBackground` becomes `editor-background` and
 * `accent` stays `accent`.
 */
export function tokenKeyToCssFragment(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * Render a scalar token value as a CSS value string. Numbers that represent
 * spacing or radii are emitted in pixels; numbers that represent z-index or
 * unitless font tokens are emitted bare. Strings pass through untouched.
 */
function renderValue(value: string | number, unit: '' | 'px'): string {
  if (typeof value === 'number') {
    return unit === 'px' ? `${value}px` : `${value}`;
  }
  return value;
}

/**
 * Build the color portion of the variable map. The variable names are produced
 * by {@link colorVar} from the contracts package so that they match every other
 * consumer in the platform exactly.
 */
function colorVariables(colors: ColorTokens): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(colors) as Array<keyof ColorTokens>) {
    const value = colors[key];
    if (typeof value !== 'string') {
      continue;
    }
    // colorVar returns the full `var(--color-...)` reference; we want the bare
    // custom property name, so strip the wrapping `var(...)`.
    const reference = colorVar(key);
    const name = unwrapVar(reference) ?? `--color-${tokenKeyToCssFragment(String(key))}`;
    out[name] = value;
  }
  return out;
}

/**
 * Extract the custom property name from a `var(--name)` reference. Returns
 * undefined when the input is not a recognizable var() reference.
 */
function unwrapVar(reference: string): string | undefined {
  const match = /^var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,[^)]*)?\)$/.exec(reference.trim());
  return match?.[1];
}

function spaceVariables(spaceTokens: SpaceTokens): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(spaceTokens) as Array<keyof SpaceTokens>) {
    const value = spaceTokens[key];
    if (typeof value !== 'number' && typeof value !== 'string') {
      continue;
    }
    out[`--space-${tokenKeyToCssFragment(String(key))}`] = renderValue(value, 'px');
  }
  return out;
}

function radiusVariables(radiusTokens: RadiusTokens): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(radiusTokens) as Array<keyof RadiusTokens>) {
    const value = radiusTokens[key];
    if (typeof value !== 'number' && typeof value !== 'string') {
      continue;
    }
    out[`--radius-${tokenKeyToCssFragment(String(key))}`] = renderValue(value, 'px');
  }
  return out;
}

function fontVariables(fontTokens: FontTokens): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(fontTokens) as Array<keyof FontTokens>) {
    const value = fontTokens[key];
    if (typeof value !== 'number' && typeof value !== 'string') {
      continue;
    }
    // Font family strings stay as-is; font sizes and weights are numbers. Sizes
    // are pixel based, weights are unitless. We treat any key containing
    // "weight" or "height" as unitless, everything else numeric as px.
    const fragment = tokenKeyToCssFragment(String(key));
    const unitless = /weight|height|line/.test(fragment);
    out[`--font-${fragment}`] = renderValue(value, unitless ? '' : 'px');
  }
  return out;
}

function motionVariables(motionTokens: MotionTokens): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(motionTokens) as Array<keyof MotionTokens>) {
    const value = motionTokens[key];
    if (typeof value !== 'number' && typeof value !== 'string') {
      continue;
    }
    const fragment = tokenKeyToCssFragment(String(key));
    // Durations are numeric milliseconds; easing curves are strings.
    const rendered =
      typeof value === 'number' ? `${value}ms` : value;
    out[`--motion-${fragment}`] = rendered;
  }
  return out;
}

function zIndexVariables(zIndexTokens: ZIndexTokens): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(zIndexTokens) as Array<keyof ZIndexTokens>) {
    const value = zIndexTokens[key];
    if (typeof value !== 'number' && typeof value !== 'string') {
      continue;
    }
    out[`--z-${tokenKeyToCssFragment(String(key))}`] = renderValue(value, '');
  }
  return out;
}

/**
 * Turn a theme's full token set into a flat map of CSS custom properties.
 *
 * The map keys are bare custom property names (for example `--color-accent`)
 * and the values are ready to assign. Color variables use {@link colorVar} so
 * they line up with the rest of the platform; spacing, radius, font, motion,
 * and z-index variables follow the `--space-*`, `--radius-*`, `--font-*`,
 * `--motion-*`, and `--z-*` conventions respectively.
 */
export function themeToCssVariables(theme: Theme): Record<string, string> {
  const tokens = tokensForTheme(theme);
  return {
    ...colorVariables(tokens.color),
    ...spaceVariables(tokens.space),
    ...radiusVariables(tokens.radius),
    ...fontVariables(tokens.font),
    ...motionVariables(tokens.motion),
    ...zIndexVariables(tokens.zIndex),
  };
}

/**
 * Render a theme as a `:root { ... }` CSS rule string. The optional selector
 * lets callers scope the variables (for example to `[data-theme="dark"]`).
 * Declarations are emitted in a stable, sorted order so the output is
 * deterministic and diff friendly.
 */
export function themeToCssText(theme: Theme, selector = ':root'): string {
  const vars = themeToCssVariables(theme);
  const lines = Object.keys(vars)
    .sort()
    .map((name) => `  ${name}: ${vars[name]};`);
  return `${selector} {\n${lines.join('\n')}\n}`;
}
