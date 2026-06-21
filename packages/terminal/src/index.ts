/**
 * @vsclaude/terminal
 *
 * A typed pseudo terminal client that drives a PTY over the frozen vsclaude IPC
 * protocol. This package contains the transport-agnostic domain logic only: it
 * imports no xterm, no DOM, and no native bindings. The xterm rendering layer and
 * the Electron host bridge are layered on top later (see ROADMAP.md).
 *
 * The two entry points are:
 *  - {@link Transport}: a typed bridge to the host IPC layer.
 *  - {@link TerminalSession}: the lifecycle owner for a single terminal.
 *
 * {@link FakeTransport} is an in-memory transport for tests and local development.
 */

export type { Transport } from './transport.js';

export {
  FakeTransport,
  type RecordedInvoke,
  type CommandResponder,
} from './fake-transport.js';

export {
  TerminalSession,
  PTY_COMMANDS,
  PTY_EVENTS,
  type OpenResult,
  type SessionStatus,
  type DataHandler,
  type ExitHandler,
  type PtyCreateCommand,
  type PtyWriteCommand,
  type PtyResizeCommand,
  type PtyKillCommand,
  type PtyDataEvent,
  type PtyExitEvent,
} from './session.js';
