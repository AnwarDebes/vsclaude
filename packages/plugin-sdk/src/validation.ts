import type { PluginManifest, PluginContributions } from '@vsclaude/contracts';

/**
 * A single validation problem found while checking a manifest.
 * `path` is a dotted path into the manifest object, for example
 * "contributes.themes" or "apiVersion".
 */
export interface ValidationError {
  readonly path: string;
  readonly message: string;
}

/**
 * Result of {@link validateManifest}. When `ok` is true the `errors`
 * array is empty. When `ok` is false it lists every problem found,
 * collected eagerly so an author can fix them all in one pass.
 */
export interface ValidationResult {
  readonly ok: boolean;
  readonly errors: readonly ValidationError[];
}

/** Type guard for non-empty trimmed strings. */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Matches a loose semver-ish identifier or a simple slug. Plugin ids
 * and versions should be stable, url and file safe tokens.
 */
const ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/i;

/** Keys we expect to find on a {@link PluginContributions} object. */
const KNOWN_CONTRIBUTION_KEYS: readonly (keyof PluginContributions)[] = [
  'themes',
  'panels',
  'pixieStates',
  'visualizations',
  'providers',
];

/**
 * Validate a candidate plugin manifest without throwing. The input is
 * treated as `unknown` so this is safe to call on data loaded from disk,
 * a registry response, or a dynamic import. Every discoverable problem is
 * collected; the function never short circuits on the first error.
 *
 * Checks performed:
 *  - the value is a non-null object
 *  - `id`, `name`, and `version` are non-empty strings
 *  - `id` matches a url and file safe pattern
 *  - `apiVersion` is present and is a finite number (not a numeric string)
 *  - `contributes`, when present, is an object whose known array fields
 *    are arrays
 */
export function validateManifest(candidate: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof candidate !== 'object' || candidate === null) {
    errors.push({ path: '', message: 'manifest must be a non-null object' });
    return { ok: false, errors };
  }

  const m = candidate as Record<string, unknown>;

  if (!isNonEmptyString(m['id'])) {
    errors.push({ path: 'id', message: 'id is required and must be a non-empty string' });
  } else if (!ID_PATTERN.test(m['id'])) {
    errors.push({
      path: 'id',
      message: 'id must contain only letters, digits, dot, dash, or underscore',
    });
  }

  if (!isNonEmptyString(m['name'])) {
    errors.push({ path: 'name', message: 'name is required and must be a non-empty string' });
  }

  if (!isNonEmptyString(m['version'])) {
    errors.push({ path: 'version', message: 'version is required and must be a non-empty string' });
  }

  const apiVersion = m['apiVersion'];
  if (apiVersion === undefined || apiVersion === null) {
    errors.push({ path: 'apiVersion', message: 'apiVersion is required' });
  } else if (typeof apiVersion !== 'number' || !Number.isFinite(apiVersion)) {
    errors.push({
      path: 'apiVersion',
      message: 'apiVersion must be a finite number, not a string or other type',
    });
  }

  const contributes = m['contributes'];
  if (contributes !== undefined) {
    if (typeof contributes !== 'object' || contributes === null) {
      errors.push({ path: 'contributes', message: 'contributes must be an object when present' });
    } else {
      const c = contributes as Record<string, unknown>;
      for (const key of KNOWN_CONTRIBUTION_KEYS) {
        const field = c[key];
        if (field !== undefined && !Array.isArray(field)) {
          errors.push({
            path: `contributes.${key}`,
            message: `contributes.${key} must be an array when present`,
          });
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Narrowing convenience wrapper around {@link validateManifest}. Returns
 * true and narrows the type when the candidate satisfies the manifest
 * shape, so callers can use it directly in a guard.
 */
export function isValidManifest(candidate: unknown): candidate is PluginManifest {
  return validateManifest(candidate).ok;
}
