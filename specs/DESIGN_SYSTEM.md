# Design System

The vsclaude design system is a cozy pixel-craft visual language built on a terracotta accent over warm charcoal. It exists as a single token-driven source of truth (CSS variables generated from a token JSON), a set of accessible themes (light, dark, high-contrast, color-blind-safe), and a fully cataloged component inventory that lives in `packages/design-system`. Every visual surface in the app, including Pixie, consumes these tokens so the product feels alive, truthful, and consistent. Each component ships with a Storybook story, and Pixie-facing components ship a story for every state and every mood so the motion language is auditable at a glance.

## Table of contents

- [Principles](#principles)
- [Token taxonomy](#token-taxonomy)
- [Color tokens](#color-tokens)
- [Semantic color tokens](#semantic-color-tokens)
- [Spacing scale](#spacing-scale)
- [Radius scale](#radius-scale)
- [Typography](#typography)
- [Elevation](#elevation)
- [Motion language tokens](#motion-language-tokens)
- [Z-index scale](#z-index-scale)
- [Themes](#themes)
- [Sample token JSON](#sample-token-json)
- [Sample CSS variable block](#sample-css-variable-block)
- [Component inventory](#component-inventory)
- [Storybook conventions](#storybook-conventions)
- [Pixie state and mood matrix](#pixie-state-and-mood-matrix)

## Principles

1. **Token first, never hex.** Components reference CSS variables, never literal colors. Theming and contrast modes flip by swapping a `:root[data-theme]` block, not by editing components.
2. **Cozy pixel-craft.** Warm, low-saturation surfaces, crisp 1px hairlines, soft pixel-grid radii, gentle inner glow on active controls. The aesthetic reads as a warm workshop, not a sterile dashboard.
3. **Motion is bound to events.** Motion tokens (durations, easings) are shared by Pixie and the UI so timing feels of one piece. See the [three sacred motion rules](./ARCHITECTURE.md) and [Pixie spec](./PIXIE.md).
4. **Accessible by construction.** Every theme passes WCAG AA for text and UI. A high-contrast theme passes AAA. A color-blind-safe theme never encodes meaning by hue alone.

## Token taxonomy

Tokens are layered. Raw tokens hold primitive values. Semantic tokens map raw tokens to roles. Component tokens (optional) map semantic tokens to a specific widget. Components should consume semantic tokens whenever a role exists.

```
raw  ->  semantic  ->  component
--clay-500   -->  --color-accent   -->  --button-primary-bg
```

| Layer | Prefix | Example | Who consumes it |
|-------|--------|---------|-----------------|
| Raw color | `--clay-*`, `--char-*`, `--sage-*` | `--clay-500` | Semantic layer only |
| Semantic color | `--color-*` | `--color-accent` | Components |
| Spacing | `--space-*` | `--space-3` | Components |
| Radius | `--radius-*` | `--radius-md` | Components |
| Typography | `--font-*`, `--text-*`, `--leading-*`, `--weight-*` | `--text-md` | Components |
| Elevation | `--elevation-*` | `--elevation-2` | Components |
| Motion | `--duration-*`, `--ease-*` | `--duration-base` | Components, Pixie |
| Z-index | `--z-*` | `--z-modal` | Components |

## Color tokens

Raw palettes use a 50 to 900 ramp. Terracotta (`clay`) is the brand accent. Warm charcoal (`char`) is the neutral surface family with a deliberate warm bias (a touch of red and yellow in the gray). `sage`, `amber`, `rust`, and `sky` carry status.

| Family | Role | Light anchor | Dark anchor |
|--------|------|--------------|-------------|
| `clay` | Terracotta accent | `#C2613D` | `#E08A5F` |
| `char` | Warm charcoal neutrals | `#FAF6F1` (bg) | `#1B1714` (bg) |
| `sage` | Success | `#5E8C61` | `#7FB083` |
| `amber` | Warning | `#C8902B` | `#E5B450` |
| `rust` | Danger / error | `#B23A2E` | `#E06A5C` |
| `sky` | Info / links | `#3E6F9E` | `#6FA8D6` |

```css
/* raw color ramp (dark theme anchors shown) */
--clay-50:  #FBEDE6;
--clay-100: #F4D5C5;
--clay-300: #E0A07F;
--clay-500: #E08A5F; /* accent */
--clay-600: #C2613D;
--clay-700: #9B4A2D;
--clay-900: #5C2A19;

--char-50:  #2A241F;
--char-100: #241F1B;
--char-200: #1F1A16;
--char-300: #1B1714; /* app bg */
--char-700: #C9BFB5;
--char-900: #F3ECE4; /* primary text on dark */
```

## Semantic color tokens

Components reference only these. Switching a theme reassigns the right side; the names never change.

| Token | Role |
|-------|------|
| `--color-bg` | App background |
| `--color-bg-subtle` | Recessed panels, sidebars |
| `--color-surface` | Cards, panels, popovers |
| `--color-surface-raised` | Floating surfaces above content |
| `--color-border` | Default hairline border |
| `--color-border-strong` | Emphasized or focused border |
| `--color-text` | Primary text |
| `--color-text-muted` | Secondary text, captions |
| `--color-text-inverse` | Text on accent fills |
| `--color-accent` | Terracotta brand action |
| `--color-accent-hover` | Accent hover state |
| `--color-accent-muted` | Accent tint backgrounds |
| `--color-focus-ring` | Keyboard focus outline |
| `--color-success` | Success status |
| `--color-warning` | Warning status |
| `--color-danger` | Error / destructive |
| `--color-info` | Info / links |
| `--color-selection` | Text and list selection |

## Spacing scale

A 4px base grid. The pixel-craft aesthetic favors whole-pixel rhythm, so all spacing is a multiple of 4.

| Token | Value | Typical use |
|-------|-------|-------------|
| `--space-0` | 0 | Reset |
| `--space-1` | 4px | Icon gaps, tight inline |
| `--space-2` | 8px | Control padding |
| `--space-3` | 12px | Compact stack gap |
| `--space-4` | 16px | Default block gap |
| `--space-5` | 24px | Section padding |
| `--space-6` | 32px | Card padding, large gaps |
| `--space-7` | 48px | Page gutters |
| `--space-8` | 64px | Hero spacing |

## Radius scale

Soft but pixel-honest corners. `--radius-pixel` is a deliberate 2px nod to the sprite grid used on small chips and Pixie's frame.

| Token | Value | Use |
|-------|-------|-----|
| `--radius-pixel` | 2px | Chips, pixel frames |
| `--radius-sm` | 4px | Inputs, small buttons |
| `--radius-md` | 8px | Cards, buttons, popovers |
| `--radius-lg` | 12px | Panels, modals |
| `--radius-xl` | 20px | Large containers |
| `--radius-full` | 9999px | Pills, avatars |

## Typography

Two families. A warm humanist sans for UI, a crisp monospace for code, terminal, diffs, and event captions where alignment matters. Both ship as bundled `woff2` to avoid network calls at runtime.

- **UI sans:** Inter Variable (fallback: `system-ui, -apple-system, Segoe UI, sans-serif`).
- **Code monospace:** JetBrains Mono (fallback: `ui-monospace, SFMono-Regular, Menlo, monospace`).

```css
--font-sans: "Inter var", system-ui, -apple-system, "Segoe UI", sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
```

Type scale (1.25 major-third-ish ramp, tuned for density):

| Token | Size | Line height | Weight token | Use |
|-------|------|-------------|--------------|-----|
| `--text-xs` | 11px | `--leading-tight` | `--weight-regular` | Captions, badges |
| `--text-sm` | 13px | `--leading-snug` | `--weight-regular` | Secondary UI, code |
| `--text-md` | 14px | `--leading-normal` | `--weight-regular` | Body, default UI |
| `--text-lg` | 16px | `--leading-normal` | `--weight-medium` | Emphasized body |
| `--text-xl` | 20px | `--leading-snug` | `--weight-semibold` | Section titles |
| `--text-2xl` | 26px | `--leading-tight` | `--weight-bold` | Page titles |

```css
--leading-tight: 1.2;
--leading-snug: 1.35;
--leading-normal: 1.5;
--weight-regular: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;
```

## Elevation

Warm shadows (a hint of brown rather than pure black) keep the cozy feel. Each elevation pairs a shadow with an optional hairline border for crispness on light backgrounds.

| Token | Shadow | Use |
|-------|--------|-----|
| `--elevation-0` | none | Flat, inline |
| `--elevation-1` | `0 1px 2px rgba(40,28,20,.18)` | Cards, list rows |
| `--elevation-2` | `0 4px 10px rgba(40,28,20,.22)` | Popovers, dropdowns |
| `--elevation-3` | `0 10px 28px rgba(40,28,20,.30)` | Modals, command palette |
| `--elevation-glow` | `0 0 0 3px var(--color-accent-muted)` | Active accent emphasis |

## Motion language tokens

Shared by UI transitions (Motion / GSAP) and by Pixie's Rive intensity blends so the whole product breathes together. Durations are short by default: this is a fast and light tool, motion should clarify, never delay.

| Token | Value | Use |
|-------|-------|-----|
| `--duration-instant` | 80ms | Hover, focus, micro-feedback |
| `--duration-fast` | 140ms | Toggles, small reveals |
| `--duration-base` | 220ms | Panels, drawers, route changes |
| `--duration-slow` | 360ms | Modals, large surfaces |
| `--duration-ambient` | 1200ms | Pixie idle breathing, ambient loops |

| Easing token | Curve | Feel |
|--------------|-------|------|
| `--ease-standard` | `cubic-bezier(.2,0,0,1)` | Default in / out |
| `--ease-entrance` | `cubic-bezier(.16,1,.3,1)` | Confident arrival |
| `--ease-exit` | `cubic-bezier(.4,0,1,1)` | Quick departure |
| `--ease-spring` | `cubic-bezier(.34,1.56,.64,1)` | Playful Pixie pop |

Motion intent tokens map a duration plus easing to a semantic role so components stay consistent:

```css
--motion-enter: var(--duration-base) var(--ease-entrance);
--motion-exit:  var(--duration-fast) var(--ease-exit);
--motion-toggle: var(--duration-fast) var(--ease-standard);
--motion-pixie-pop: var(--duration-fast) var(--ease-spring);
```

All motion respects `prefers-reduced-motion`. When reduced, transitions collapse to `--duration-instant` and Pixie holds static state frames instead of looping.

## Z-index scale

A small, named stack. Never use literal z-index in components.

| Token | Value | Layer |
|-------|-------|-------|
| `--z-base` | 0 | Document flow |
| `--z-sticky` | 100 | Sticky headers, tab bars |
| `--z-swarm` | 200 | Pixie / swarm canvas overlay |
| `--z-dropdown` | 300 | Menus, selects |
| `--z-overlay` | 400 | Scrims, backdrops |
| `--z-modal` | 500 | Dialogs, command palette |
| `--z-toast` | 600 | Notifications |
| `--z-tooltip` | 700 | Tooltips (always on top) |

## Themes

Themes are applied with `data-theme` on `:root`. Color-blind safety is handled by a separate `data-cvd` attribute so it can compose with light or dark.

| Theme | Selector | Purpose |
|-------|----------|---------|
| Dark | `:root[data-theme="dark"]` | Default, primary trading-room feel |
| Light | `:root[data-theme="light"]` | Daytime, high ambient light |
| High contrast | `:root[data-theme="hc"]` | AAA contrast, thicker borders, no subtle fills |
| Color-blind safe | `:root[data-cvd="safe"]` | Re-maps status hues, adds icons and patterns |

Theme rules:

- High contrast raises `--color-border` to a strong value, removes `--color-bg-subtle` tinting, and forces a 2px `--color-focus-ring`.
- Color-blind-safe never relies on red/green alone. Success uses `sky`-leaning teal plus a check glyph, danger uses a deep magenta-rust plus a cross glyph, and all status chips carry a shape, not just a color. This satisfies sacred motion rule 3 (a non-technical person can follow along) by keeping meaning legible without color vision.
- Pixie's mood tints (calm/focused/excited/struggling) read from the same semantic tokens, so mood color shifts automatically per theme.

## Sample token JSON

The canonical source lives at `packages/design-system/tokens/tokens.json` and is compiled to CSS variables by a small Style Dictionary build step. Excerpt:

```json
{
  "color": {
    "clay": { "500": { "value": "#E08A5F" }, "600": { "value": "#C2613D" } },
    "char": { "300": { "value": "#1B1714" }, "900": { "value": "#F3ECE4" } },
    "semantic": {
      "bg":      { "value": "{color.char.300}" },
      "surface": { "value": "{color.char.200}" },
      "text":    { "value": "{color.char.900}" },
      "accent":  { "value": "{color.clay.500}" },
      "danger":  { "value": "#E06A5C" }
    }
  },
  "space": { "4": { "value": "16px" } },
  "radius": { "md": { "value": "8px" } },
  "text": { "md": { "value": "14px" } },
  "duration": { "base": { "value": "220ms" } },
  "ease": { "standard": { "value": "cubic-bezier(.2,0,0,1)" } },
  "z": { "modal": { "value": 500 } }
}
```

## Sample CSS variable block

Generated output, dark theme. This is what components actually read.

```css
:root,
:root[data-theme="dark"] {
  /* surfaces */
  --color-bg: #1B1714;
  --color-bg-subtle: #1F1A16;
  --color-surface: #241F1B;
  --color-surface-raised: #2A241F;
  --color-border: #3A332C;
  --color-border-strong: #574C42;

  /* text */
  --color-text: #F3ECE4;
  --color-text-muted: #B7ABA0;
  --color-text-inverse: #1B1714;

  /* accent */
  --color-accent: #E08A5F;
  --color-accent-hover: #EC9C73;
  --color-accent-muted: rgba(224,138,95,.16);
  --color-focus-ring: #EC9C73;

  /* status */
  --color-success: #7FB083;
  --color-warning: #E5B450;
  --color-danger: #E06A5C;
  --color-info: #6FA8D6;
  --color-selection: rgba(224,138,95,.28);

  /* spacing, radius, type, motion, z (abbreviated) */
  --space-4: 16px;
  --radius-md: 8px;
  --text-md: 14px;
  --leading-normal: 1.5;
  --duration-base: 220ms;
  --ease-standard: cubic-bezier(.2,0,0,1);
  --z-modal: 500;
}

:root[data-theme="light"] {
  --color-bg: #FAF6F1;
  --color-bg-subtle: #F1E9DF;
  --color-surface: #FFFFFF;
  --color-border: #E2D6C9;
  --color-text: #2A241F;
  --color-text-muted: #6E635A;
  --color-accent: #C2613D;
  --color-accent-hover: #A94F30;
  --color-focus-ring: #C2613D;
}

:root[data-theme="hc"] {
  --color-bg: #000000;
  --color-surface: #0A0A0A;
  --color-border: #FFFFFF;
  --color-border-strong: #FFFFFF;
  --color-text: #FFFFFF;
  --color-accent: #FFA362;
  --color-focus-ring: #FFD400;
}

:root[data-cvd="safe"] {
  --color-success: #3FB6C0; /* teal, not green */
  --color-warning: #E5B450; /* amber holds */
  --color-danger:  #D6478E; /* magenta-rust, not pure red */
  --color-info:    #6FA8D6;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 80ms;
    --duration-base: 80ms;
    --duration-slow: 80ms;
    --duration-ambient: 80ms;
  }
}
```

## Component inventory

Everything below lives in `packages/design-system/src`. Components are presentational and token-driven. Each has a `.stories.tsx` file. Provider, session, and event data flow in as props; components hold no provider logic.

### Primitives

| Component | Notes |
|-----------|-------|
| `Button` | Variants: primary (accent), secondary, ghost, danger. Sizes sm/md/lg. Loading and disabled states. |
| `IconButton` | Square, accessible label required. |
| `Input`, `Textarea` | Focus ring from `--color-focus-ring`, error state from `--color-danger`. |
| `Select`, `Combobox` | Keyboard nav, typeahead. |
| `Checkbox`, `Radio`, `Switch` | Switch animates via `--motion-toggle`. |
| `Slider` | Used for Pixie intensity preview and speed controls. |
| `Tooltip` | `--z-tooltip`, delay tokens. |
| `Badge`, `Chip` | Status variants carry shape plus color for CVD safety. |
| `Avatar` | Pixel-frame radius option. |
| `Spinner`, `ProgressBar`, `Skeleton` | Skeleton uses `--color-bg-subtle` shimmer. |
| `Kbd` | Monospace keycap for shortcut hints. |
| `Divider` | Hairline using `--color-border`. |

### Layout and surfaces

| Component | Notes |
|-----------|-------|
| `Card`, `Panel` | Elevation 1, optional header and footer slots. |
| `Modal`, `Drawer` | `--z-modal`, scrim at `--z-overlay`, enter/exit motion tokens. |
| `Popover`, `DropdownMenu`, `ContextMenu` | `--z-dropdown`, `--elevation-2`. |
| `Tabs`, `SegmentedControl` | Animated indicator on `--motion-toggle`. |
| `Toast` / `Toaster` | `--z-toast`, success/warning/danger/info. |
| `Tree` | File tree, expand/collapse. |
| `SplitPane`, `Resizable` | Editor + terminal + swarm layout. |
| `StatusBar` | Bottom bar: provider, model, token usage, session state. |
| `Toolbar` | Sticky, `--z-sticky`. |
| `EmptyState` | Truthful empty UI, never mock data. |
| `ErrorBoundaryFallback` | Recoverable error surface with retry. |

### Domain components (event-aware)

These render `AgentEvent` data. See the [Architecture](./ARCHITECTURE.md) and the frozen event contract.

| Component | Renders |
|-----------|---------|
| `EventRow` | A single normalized `AgentEvent` with `caption`, icon by `type`, and a drill-in affordance (sacred rule 2: meaning is recoverable). |
| `EventTimeline` | Virtualized stream of `EventRow`. |
| `CaptionBar` | The plain-language caption surface (sacred rule 3). |
| `DiffViewer` | Monaco-backed read view for `file_edit` payloads. |
| `ToolCallCard` | Tool name, inputs, result, raw toggle. |
| `CommandBlock` | `command_run` / `command_output`, mono, ANSI-aware. |
| `TodoList` | Renders `todo_update` payloads, drives Pixie `planning`. |
| `PermissionPrompt` | `permission_request`, drives Pixie `waiting`. |
| `TokenMeter` | `token_usage`, live count. |
| `ProviderBadge` | claude-code / codex / gemini / ollama. |
| `SwarmNode`, `SwarmCanvas` | Sub-agent graph from `subagent_spawned`. PixiJS fallback when DOM stalls. |
| `PixieStage` | Hosts the Rive instance; exposes `state`, `mood`, `intensity`, `targetX`, `targetY`. |

## Storybook conventions

- One story file per component: `Component.stories.tsx`.
- Every component story includes a default, all variants, and edge states (loading, error, empty, long content, RTL where relevant).
- Each story runs against all four themes via a Storybook toolbar global (`theme` and `cvd`), so reviewers can flip themes without leaving the canvas.
- Visual regression is captured by Playwright snapshots of key stories.
- Token documentation is itself a Storybook page: a generated swatch grid reads `tokens.json` so the docs can never drift from the source.

## Pixie state and mood matrix

`PixieStage` is special: it carries a story for every state crossed with every mood, so the motion language is fully reviewable. The states bind to `AgentEvent` types; the moods layer on top.

```
states  = [greeting, idle, sleeping, thinking, planning, reading, typing,
           searching, web, running, debugging, building, git, spawning,
           waiting, success, confused]
moods   = [calm, focused, excited, struggling]
```

Story coverage:

| Story group | What it shows |
|-------------|---------------|
| `Pixie/States/<state>` | One story per state at default mood, with the bound `AgentEventType` shown in the caption. |
| `Pixie/Moods/<state>--<mood>` | Each state across all four moods, validating tint and intensity blends per theme. |
| `Pixie/Intensity` | A slider-driven story sweeping `intensity` 0 to 1 to verify the Rive blend. |
| `Pixie/Targeting` | `targetX` / `targetY` story confirming Pixie can point at a file row or swarm node. |
| `Pixie/ReducedMotion` | All states rendered as static frames to verify the `prefers-reduced-motion` path. |

Mapping reference (state to triggering event):

| Pixie state | Bound event | Default mood |
|-------------|-------------|--------------|
| `greeting` | `session_start` | calm |
| `idle` | no activity | calm |
| `sleeping` | long idle | calm |
| `thinking` | `thinking` | focused |
| `planning` | `todo_update` | focused |
| `reading` | `file_read` | focused |
| `typing` | `file_edit`, `file_create` | focused |
| `searching` | `search` | focused |
| `web` | `web_fetch` | focused |
| `running` | `command_run` | focused |
| `debugging` | `error` during run | struggling |
| `building` | long build | focused |
| `git` | `git_action` | focused |
| `spawning` | `subagent_spawned` | excited |
| `waiting` | `permission_request` | calm |
| `success` | `complete` | excited |
| `confused` | unresolved error | struggling |

Because Pixie reads only semantic tokens and motion tokens, switching theme or enabling reduced motion or color-blind-safe mode updates every Pixie state automatically, with no per-state code. That is the payoff of the token-first design: one source of truth, fully themeable, fully accessible, and bound to real events.

See also: [Architecture](./ARCHITECTURE.md), [Pixie](./PIXIE.md), [Theming](./THEMING.md).
