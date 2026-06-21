# @vsclaude/persistence

The persistence layer for the vsclaude IDE. It turns in-memory app state into durable, validated documents and back: it serializes recorded agent sessions, loads and saves user settings by deep-merging over the frozen defaults from `@vsclaude/contracts`, and defines a secret-storage contract for API keys and tokens. Everything in this package is pure TypeScript with no native or UI dependencies, so it is safe to import from both the privileged main process and the renderer.

## What lives here

- **Session serialization** (`serializeSession`, `parseSession`, `validateSession`): stable JSON output and strict parsing that validates the metadata header, the checkpoint list, and every event in the stream through the frozen `isAgentEvent` guard. Malformed input throws a `PersistenceError` that points at the offending field, and a mismatched event schema version throws `SchemaVersionError`.
- **Settings** (`mergeSettings`, `loadSettings`, `serializeSettings`): a recursive deep-merge of a partial override onto `DEFAULT_SETTINGS`. Objects merge recursively; arrays and primitives replace wholesale. The frozen defaults are never mutated, and corrupt preference files load as defaults rather than blocking startup.
- **Secrets** (`SecretStore`, `InMemorySecretStore`): a minimal async key/value contract for sensitive values, with an in-memory implementation for tests and early development.
- **Guards** (`isRecord`, `isFiniteNumber`, `isNonEmptyString`): small dependency-free runtime narrowing helpers.

## Usage

```ts
import {
  serializeSession,
  parseSession,
  mergeSettings,
  InMemorySecretStore,
} from '@vsclaude/persistence';

// Round-trip a recorded session to and from disk.
const json = serializeSession(session);
const restored = parseSession(json); // throws on any malformed event

// Layer a user's overrides on top of the shipped defaults.
const settings = mergeSettings({ sound: { muted: true } });

// Store a provider key out of band from regular documents.
const secrets = new InMemorySecretStore();
await secrets.set('provider:anthropic:apiKey', 'sk-...');
const key = await secrets.get('provider:anthropic:apiKey');
```

## Status

This is the initial logic layer: pure, fully testable domain logic with no platform bindings. The production `SecretStore` that talks to the OS keychain (Keychain, Credential Manager, libsecret) over IPC, and the file-system read/write wiring for sessions and settings, are tracked in `ROADMAP.md` and land alongside the native and React integrations.
