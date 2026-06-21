/**
 * Design tokens: the single source of truth for the cozy pixel-craft look.
 *
 * The token shapes and the default themes live here in contracts so every
 * package shares one palette. The `design-system` package turns these into CSS
 * variables and Tailwind theme extensions. Nothing in the UI should hardcode a
 * color or a spacing value; it flows from here.
 *
 * Brand direction: warm terracotta and clay accents on a deep warm charcoal
 * base, soft glows, generous spacing, rounded but crisp.
 */

/** Semantic color slots. Every theme provides a value for each. */
export interface ColorTokens {
  /** App background, the deepest layer. */
  bg: string;
  /** A raised surface (panels, cards). */
  surface: string;
  /** A further raised surface (popovers, menus). */
  surfaceElevated: string;
  /** Hairline borders and dividers. */
  border: string;
  /** Primary text. */
  text: string;
  /** Secondary or muted text. */
  textMuted: string;
  /** The terracotta brand accent. */
  accent: string;
  /** A softer accent for hovers and fills. */
  accentMuted: string;
  /** Foreground that sits on top of the accent. */
  accentContrast: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  /** A warm glow color for focus rings and Pixie highlights. */
  glow: string;
}

/** A modular spacing scale in pixels. */
export interface SpaceTokens {
  px: string;
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
}

/** Corner radii. */
export interface RadiusTokens {
  none: string;
  sm: string;
  md: string;
  lg: string;
  full: string;
}

/** Typography tokens. */
export interface FontTokens {
  /** UI sans family stack. */
  sans: string;
  /** Code and pixel-terminal monospace stack. */
  mono: string;
  /** Type scale in rem. */
  sizeXs: string;
  sizeSm: string;
  sizeMd: string;
  sizeLg: string;
  sizeXl: string;
  size2xl: string;
}

/** Motion tokens. Durations in milliseconds, easings as cubic-bezier strings. */
export interface MotionTokens {
  durationInstant: string;
  durationFast: string;
  durationBase: string;
  durationSlow: string;
  easeStandard: string;
  easeEntrance: string;
  easeExit: string;
  /** A soft, settled spring for cozy transitions. */
  easeCozy: string;
}

/** Layering. */
export interface ZIndexTokens {
  base: number;
  panel: number;
  overlay: number;
  popover: number;
  modal: number;
  toast: number;
  pixie: number;
}

/** A complete set of tokens for one theme. */
export interface DesignTokens {
  color: ColorTokens;
  space: SpaceTokens;
  radius: RadiusTokens;
  font: FontTokens;
  motion: MotionTokens;
  zIndex: ZIndexTokens;
}

/** A named theme and its color tokens. The non-color tokens are shared. */
export interface Theme {
  id: string;
  name: string;
  appearance: 'light' | 'dark';
  /** True for the accessibility high-contrast variants. */
  highContrast?: boolean;
  /** True for the color-blind-safe variants. */
  colorBlindSafe?: boolean;
  color: ColorTokens;
}

/* ----------------------------------------------------------------------------
 * Shared non-color tokens
 * ------------------------------------------------------------------------- */

export const space: SpaceTokens = {
  px: '1px',
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '48px',
};

export const radius: RadiusTokens = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '14px',
  full: '9999px',
};

export const font: FontTokens = {
  sans: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', 'Cascadia Code', 'SFMono-Regular', ui-monospace, monospace",
  sizeXs: '0.75rem',
  sizeSm: '0.875rem',
  sizeMd: '1rem',
  sizeLg: '1.125rem',
  sizeXl: '1.375rem',
  size2xl: '1.75rem',
};

export const motion: MotionTokens = {
  durationInstant: '80ms',
  durationFast: '140ms',
  durationBase: '220ms',
  durationSlow: '420ms',
  easeStandard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  easeEntrance: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  easeExit: 'cubic-bezier(0.4, 0.0, 1, 1)',
  easeCozy: 'cubic-bezier(0.34, 1.2, 0.64, 1)',
};

export const zIndex: ZIndexTokens = {
  base: 0,
  panel: 10,
  overlay: 100,
  popover: 200,
  modal: 300,
  toast: 400,
  pixie: 500,
};

/* ----------------------------------------------------------------------------
 * Themes
 * ------------------------------------------------------------------------- */

/** The flagship warm dark theme. This is the primary experience. */
export const darkTheme: Theme = {
  id: 'cozy-dark',
  name: 'Cozy Dark',
  appearance: 'dark',
  color: {
    bg: '#1a1614',
    surface: '#221d1a',
    surfaceElevated: '#2c2521',
    border: '#3a312c',
    text: '#f3ece6',
    textMuted: '#a8998f',
    accent: '#d97757',
    accentMuted: '#3a2620',
    accentContrast: '#1a1614',
    success: '#7fb069',
    warning: '#e0a458',
    danger: '#d96c6c',
    info: '#6c9bd9',
    glow: 'rgba(217, 119, 87, 0.45)',
  },
};

/** A warm light theme for daytime work. */
export const lightTheme: Theme = {
  id: 'cozy-light',
  name: 'Cozy Light',
  appearance: 'light',
  color: {
    bg: '#f6f1ec',
    surface: '#fbf7f3',
    surfaceElevated: '#ffffff',
    border: '#e3d8ce',
    text: '#2a211c',
    textMuted: '#7a6c62',
    accent: '#c25f3f',
    accentMuted: '#f0dcd2',
    accentContrast: '#ffffff',
    success: '#5a8a47',
    warning: '#b9802f',
    danger: '#bd4f4f',
    info: '#3f6fb0',
    glow: 'rgba(194, 95, 63, 0.35)',
  },
};

/** High-contrast dark theme for accessibility. */
export const highContrastTheme: Theme = {
  id: 'high-contrast',
  name: 'High Contrast',
  appearance: 'dark',
  highContrast: true,
  color: {
    bg: '#000000',
    surface: '#0a0a0a',
    surfaceElevated: '#141414',
    border: '#ffffff',
    text: '#ffffff',
    textMuted: '#d0d0d0',
    accent: '#ff9466',
    accentMuted: '#3a1f15',
    accentContrast: '#000000',
    success: '#7CFC00',
    warning: '#ffcf3f',
    danger: '#ff6b6b',
    info: '#6cc6ff',
    glow: 'rgba(255, 148, 102, 0.7)',
  },
};

/** Color-blind-safe dark theme using a blue and orange pairing. */
export const colorBlindSafeTheme: Theme = {
  id: 'cozy-cb-safe',
  name: 'Cozy Color-Blind Safe',
  appearance: 'dark',
  colorBlindSafe: true,
  color: {
    bg: '#1a1614',
    surface: '#221d1a',
    surfaceElevated: '#2c2521',
    border: '#3a312c',
    text: '#f3ece6',
    textMuted: '#a8998f',
    accent: '#e69f00',
    accentMuted: '#3a2c14',
    accentContrast: '#1a1614',
    success: '#56b4e9',
    warning: '#e69f00',
    danger: '#d55e00',
    info: '#56b4e9',
    glow: 'rgba(230, 159, 0, 0.45)',
  },
};

/** All bundled themes, keyed by id. */
export const THEMES: Record<string, Theme> = {
  [darkTheme.id]: darkTheme,
  [lightTheme.id]: lightTheme,
  [highContrastTheme.id]: highContrastTheme,
  [colorBlindSafeTheme.id]: colorBlindSafeTheme,
};

export const DEFAULT_THEME_ID = darkTheme.id;

/** Build the shared, theme-independent tokens with a theme's colors. */
export function tokensForTheme(theme: Theme): DesignTokens {
  return { color: theme.color, space, radius, font, motion, zIndex };
}

/** Map a color token key to its CSS custom property name, for example `--color-accent`. */
export function colorVar(key: keyof ColorTokens): string {
  const kebab = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
  return `--color-${kebab}`;
}
