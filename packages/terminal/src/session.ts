import type {
  IpcCommandName,
  IpcCommandArgs,
  IpcCommandResult,
  IpcEventName,
  IpcEventPayload,
  Unsubscribe,
} from '@vsclaude/contracts';
import type { Transport } from './transport.js';

/**
 * IPC command names used to control a pseudo terminal. These are string literals
 * that index into the frozen IPC command map.
 */
export const PTY_COMMANDS = {
  create: 'pty.create',
  write: 'pty.write',
  resize: 'pty.resize',
  kill: 'pty.kill',
} as const satisfies Record<string, IpcCommandName>;

/**
 * IPC event names the host emits for a running pseudo terminal.
 */
export const PTY_EVENTS = {
  data: 'pty:data',
  exit: 'pty:exit',
} as const satisfies Record<string, IpcEventName>;

/** Convenience aliases for the literal command names. */
export type PtyCreateCommand = typeof PTY_COMMANDS.create;
export type PtyWriteCommand = typeof PTY_COMMANDS.write;
export type PtyResizeCommand = typeof PTY_COMMANDS.resize;
export type PtyKillCommand = typeof PTY_COMMANDS.kill;

/** Convenience aliases for the literal event names. */
export type PtyDataEvent = typeof PTY_EVENTS.data;
export type PtyExitEvent = typeof PTY_EVENTS.exit;

/** Handler for a chunk of terminal output. */
export type DataHandler = (chunk: string) => void;

/** Handler for terminal exit. Receives the resolved exit code if the host provided one. */
export type ExitHandler = (exitCode: number | null) => void;

/** Lifecycle states of a {@link TerminalSession}. */
export type SessionStatus = 'idle' | 'starting' | 'running' | 'exited' | 'killed';

/** Result returned by {@link TerminalSession.open}. */
export interface OpenResult {
  /** The host-assigned identifier correlating events to this session. */
  readonly ptyId: string;
}

/**
 * Read a string field from an unknown payload without using `any`.
 */
function readString(source: unknown, key: string): string | undefined {
  if (typeof source !== 'object' || source === null) {
    return undefined;
  }
  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Read a number field from an unknown payload without using `any`.
 */
function readNumber(source: unknown, key: string): number | undefined {
  if (typeof source !== 'object' || source === null) {
    return undefined;
  }
  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Extract the correlation id from a create command result. The host may key it as
 * `ptyId` or `id`; both are accepted so the client is resilient to either contract
 * field name.
 */
function extractPtyId(result: unknown): string | undefined {
  return readString(result, 'ptyId') ?? readString(result, 'id');
}

/**
 * Extract the correlation id from an emitted event payload.
 */
function extractEventPtyId(payload: unknown): string | undefined {
  return readString(payload, 'ptyId') ?? readString(payload, 'id');
}

/**
 * A single pseudo terminal, driven entirely over a typed {@link Transport}.
 *
 * The session owns its lifecycle: {@link open} creates the PTY and starts routing
 * `pty:data` and `pty:exit` to subscribers, {@link write} sends keystrokes,
 * {@link resize} reports geometry changes, and {@link kill} terminates the process
 * and detaches every listener.
 *
 * Events are filtered by the host-assigned `ptyId` so that multiple terminals can
 * share one transport without crosstalk. The class imports no xterm or DOM types,
 * so it is usable in workers, tests, and the browser alike.
 */
export class TerminalSession {
  private readonly transport: Transport;
  private readonly dataHandlers = new Set<DataHandler>();
  private readonly exitHandlers = new Set<ExitHandler>();
  private readonly subscriptions: Unsubscribe[] = [];

  private ptyId: string | undefined;
  private state: SessionStatus = 'idle';
  private lastExitCode: number | null = null;

  constructor(transport: Transport) {
    this.transport = transport;
  }

  /** The host-assigned id for this session, or undefined before {@link open}. */
  get id(): string | undefined {
    return this.ptyId;
  }

  /** The current lifecycle status. */
  get status(): SessionStatus {
    return this.state;
  }

  /** True while the PTY is alive and accepting input. */
  get isRunning(): boolean {
    return this.state === 'running';
  }

  /** The exit code captured from the last `pty:exit` event, if any. */
  get exitCode(): number | null {
    return this.lastExitCode;
  }

  /**
   * Create the PTY on the host and begin routing its output and exit to subscribers.
   *
   * Calling open while already running is a programming error and throws, so a
   * single session never owns two host processes.
   *
   * @param args - the typed arguments for the `pty.create` command
   * @returns the host-assigned correlation id for this session
   */
  async open(args: IpcCommandArgs<PtyCreateCommand>): Promise<OpenResult> {
    if (this.state === 'starting' || this.state === 'running') {
      throw new Error('TerminalSession.open: session is already open');
    }
    this.state = 'starting';
    let result: IpcCommandResult<PtyCreateCommand>;
    try {
      result = await this.transport.invoke(PTY_COMMANDS.create, args);
    } catch (error) {
      this.state = 'idle';
      throw error;
    }
    const ptyId = extractPtyId(result);
    if (ptyId === undefined) {
      this.state = 'idle';
      throw new Error('TerminalSession.open: host did not return a pty id');
    }
    this.ptyId = ptyId;
    this.attach();
    this.state = 'running';
    return { ptyId };
  }

  /**
   * Subscribe to terminal output. The handler receives each decoded chunk.
   *
   * @returns an unsubscribe function that removes the handler
   */
  onData(handler: DataHandler): Unsubscribe {
    this.dataHandlers.add(handler);
    return () => {
      this.dataHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to terminal exit. The handler receives the exit code, or null when the
   * host did not report one.
   *
   * @returns an unsubscribe function that removes the handler
   */
  onExit(handler: ExitHandler): Unsubscribe {
    this.exitHandlers.add(handler);
    return () => {
      this.exitHandlers.delete(handler);
    };
  }

  /**
   * Send input to the terminal. The data is forwarded verbatim to `pty.write`.
   *
   * @throws if the session is not currently running
   */
  async write(data: string): Promise<void> {
    this.assertRunning('write');
    const args = this.commandArgs(data);
    await this.transport.invoke(PTY_COMMANDS.write, args);
  }

  /**
   * Report a new terminal geometry to the host via `pty.resize`.
   *
   * @param cols - number of columns, must be a positive integer
   * @param rows - number of rows, must be a positive integer
   * @throws if the session is not running or the dimensions are invalid
   */
  async resize(cols: number, rows: number): Promise<void> {
    this.assertRunning('resize');
    if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols <= 0 || rows <= 0) {
      throw new Error(`TerminalSession.resize: invalid dimensions ${cols}x${rows}`);
    }
    const args = this.resizeArgs(cols, rows);
    await this.transport.invoke(PTY_COMMANDS.resize, args);
  }

  /**
   * Terminate the host process and detach all listeners. Safe to call more than once;
   * subsequent calls are no-ops once the session has ended.
   */
  async kill(): Promise<void> {
    if (this.state === 'killed' || this.state === 'exited') {
      this.detach();
      return;
    }
    const id = this.ptyId;
    this.state = 'killed';
    if (id !== undefined) {
      const args = this.killArgs(id);
      await this.transport.invoke(PTY_COMMANDS.kill, args);
    }
    this.detach();
  }

  /**
   * Dispose of the session without sending `pty.kill`. Removes every listener and
   * marks the session ended. Use when the host has already torn the PTY down.
   */
  dispose(): void {
    if (this.state !== 'exited') {
      this.state = 'killed';
    }
    this.detach();
  }

  // --- internal wiring -----------------------------------------------------

  private attach(): void {
    const onData = this.transport.listen(PTY_EVENTS.data, (payload) => {
      this.handleData(payload);
    });
    const onExit = this.transport.listen(PTY_EVENTS.exit, (payload) => {
      this.handleExit(payload);
    });
    this.subscriptions.push(onData, onExit);
  }

  private detach(): void {
    while (this.subscriptions.length > 0) {
      const unsubscribe = this.subscriptions.pop();
      unsubscribe?.();
    }
    this.dataHandlers.clear();
    this.exitHandlers.clear();
  }

  private handleData(payload: IpcEventPayload<PtyDataEvent>): void {
    if (!this.matchesSession(payload)) {
      return;
    }
    const chunk = readString(payload, 'data');
    if (chunk === undefined) {
      return;
    }
    for (const handler of [...this.dataHandlers]) {
      handler(chunk);
    }
  }

  private handleExit(payload: IpcEventPayload<PtyExitEvent>): void {
    if (!this.matchesSession(payload)) {
      return;
    }
    const code = readNumber(payload, 'exitCode') ?? readNumber(payload, 'code') ?? null;
    this.lastExitCode = code;
    if (this.state !== 'killed') {
      this.state = 'exited';
    }
    for (const handler of [...this.exitHandlers]) {
      handler(code);
    }
    this.detach();
  }

  /**
   * Whether an emitted payload belongs to this session. When the payload carries no
   * id, it is treated as belonging to the session so single-terminal hosts still work.
   */
  private matchesSession(payload: unknown): boolean {
    const eventId = extractEventPtyId(payload);
    if (eventId === undefined || this.ptyId === undefined) {
      return true;
    }
    return eventId === this.ptyId;
  }

  private assertRunning(op: string): void {
    if (this.state !== 'running' || this.ptyId === undefined) {
      throw new Error(`TerminalSession.${op}: session is not running (status=${this.state})`);
    }
  }

  // The following helpers build command arg objects while remaining tolerant of the
  // exact field names in the frozen contract. They merge the correlation id with the
  // operation payload and cast through `unknown` once at the boundary, since the host
  // accepts either `ptyId` or `id` for correlation.

  private withId(extra: Record<string, unknown>): Record<string, unknown> {
    const base: Record<string, unknown> = { ...extra };
    if (this.ptyId !== undefined) {
      base.ptyId = this.ptyId;
      base.id = this.ptyId;
    }
    return base;
  }

  private commandArgs(data: string): IpcCommandArgs<PtyWriteCommand> {
    return this.withId({ data }) as unknown as IpcCommandArgs<PtyWriteCommand>;
  }

  private resizeArgs(cols: number, rows: number): IpcCommandArgs<PtyResizeCommand> {
    return this.withId({ cols, rows }) as unknown as IpcCommandArgs<PtyResizeCommand>;
  }

  private killArgs(id: string): IpcCommandArgs<PtyKillCommand> {
    const base: Record<string, unknown> = { ptyId: id, id };
    return base as unknown as IpcCommandArgs<PtyKillCommand>;
  }
}
