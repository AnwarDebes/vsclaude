/**
 * Error types for the persistence layer.
 *
 * Keeping these as named classes lets callers discriminate failures
 * (for example, a malformed session file versus an unsupported schema
 * version) without parsing error message strings.
 */

/**
 * Thrown when a serialized session cannot be parsed or fails validation.
 * The {@link PersistenceError.path} field, when present, points at the
 * offending location inside the document (for example
 * `events[3].type`).
 */
export class PersistenceError extends Error {
  /** Dotted path to the offending field, when known. */
  readonly path: string | undefined;

  constructor(message: string, path?: string) {
    super(path ? `${message} (at ${path})` : message);
    this.name = 'PersistenceError';
    this.path = path;
  }
}

/**
 * Thrown when a session document declares a schema version that this
 * build of the persistence layer does not know how to read.
 */
export class SchemaVersionError extends PersistenceError {
  /** Version found in the document. */
  readonly found: number;
  /** Version this build expects. */
  readonly expected: number;

  constructor(found: number, expected: number) {
    super(
      `Unsupported session schema version ${found}, expected ${expected}`,
      'schemaVersion',
    );
    this.name = 'SchemaVersionError';
    this.found = found;
    this.expected = expected;
  }
}
