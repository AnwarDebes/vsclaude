/**
 * Settings load and save with defaults.
 *
 * The app ships a frozen {@link DEFAULT_SETTINGS} baseline from
 * `@vsclaude/contracts`. User preferences are stored as a (possibly
 * partial) override document. `mergeSettings` deep-merges a partial over
 * the defaults to produce a fully populated {@link AppSettings},
 * filling every gap while preserving every explicit user choice.
 *
 * The merge is recursive for plain objects and replace-by-value for
 * arrays and primitives. Arrays are intentionally replaced rather than
 * concatenated: a user who customizes an ordered list (for example
 * panel order) means to replace it wholesale, not append to defaults.
 */

import { DEFAULT_SETTINGS } from '@vsclaude/contracts';
import type { AppSettings } from '@vsclaude/contracts';
import { isRecord } from './guards.js';

/**
 * A recursively-partial view of a type: every property, at every depth,
 * becomes optional. This is the shape an override document may take.
 */
export type DeepPartial<T> = T extends (infer U)[]
  ? U[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

/**
 * Deep-clone a JSON-compatible value. Used so the merged result never
 * shares mutable references with `DEFAULT_SETTINGS`, which keeps the
 * frozen defaults safe from accidental mutation by callers.
 */
function clone<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => clone(item)) as unknown as T;
  }
  if (isRecord(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value)) {
      out[key] = clone(inner);
    }
    return out as T;
  }
  return value;
}

/**
 * Recursively merge `override` onto a cloned `base`. Both inputs are
 * treated as opaque records; the caller guarantees type compatibility.
 */
function mergeRecords(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = clone(base);

  for (const [key, overrideValue] of Object.entries(override)) {
    // An explicit `undefined` in the override means "leave the default".
    if (overrideValue === undefined) {
      continue;
    }

    const baseValue = result[key];
    if (isRecord(baseValue) && isRecord(overrideValue)) {
      result[key] = mergeRecords(baseValue, overrideValue);
    } else {
      // Arrays and primitives replace wholesale. Clone so the result
      // owns its data outright.
      result[key] = clone(overrideValue);
    }
  }

  return result;
}

/**
 * Merge a partial settings override over {@link DEFAULT_SETTINGS}.
 *
 * @param partial A recursively-partial override. Omitted fields, and
 *   fields explicitly set to `undefined`, fall back to the default.
 * @returns A fully populated {@link AppSettings} that owns all of its
 *   data (no shared references with the frozen defaults).
 */
export function mergeSettings(
  partial?: DeepPartial<AppSettings> | null,
): AppSettings {
  const base = DEFAULT_SETTINGS as unknown as Record<string, unknown>;
  if (partial === undefined || partial === null) {
    return clone(DEFAULT_SETTINGS);
  }
  const override = partial as unknown as Record<string, unknown>;
  return mergeRecords(base, override) as unknown as AppSettings;
}

/**
 * Serialize settings to a JSON string for storage.
 */
export function serializeSettings(settings: AppSettings): string {
  return JSON.stringify(settings, null, 2);
}

/**
 * Parse a settings JSON string and merge it over the defaults. Invalid
 * JSON falls back to defaults rather than throwing, because a corrupt
 * preferences file should never block app startup. Callers that need to
 * detect corruption can compare the result against `DEFAULT_SETTINGS`.
 */
export function loadSettings(json: string): AppSettings {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return clone(DEFAULT_SETTINGS);
  }
  if (!isRecord(raw)) {
    return clone(DEFAULT_SETTINGS);
  }
  return mergeSettings(raw as DeepPartial<AppSettings>);
}
