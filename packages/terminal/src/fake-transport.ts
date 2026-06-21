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
 * A recorded command invocation, captured by {@link FakeTransport} for assertions.
 */
export interface RecordedInvoke {
  /** The command name that was invoked. */
  readonly name: IpcCommandName;
  /** The raw argument payload passed to the command. */
  readonly args: unknown;
}

/**
 * Function that produces a typed result for a faked command invocation.
 *
 * @param args - the argument payload the caller passed
 * @returns the result value, or a promise of it
 */
export type CommandResponder<N extends IpcCommandName> = (
  args: IpcCommandArgs<N>,
) => IpcCommandResult<N> | Promise<IpcCommandResult<N>>;

/**
 * An in-memory {@link Transport} for tests and local development.
 *
 * It records every {@link invoke} call, lets a test register a responder per command
 * name, and lets a test push events to subscribers via {@link emit}. No real IPC,
 * sockets, or child processes are involved, so it is fully deterministic.
 */
export class FakeTransport implements Transport {
  private readonly responders = new Map<IpcCommandName, CommandResponder<IpcCommandName>>();
  private readonly listeners = new Map<IpcEventName, Set<(payload: unknown) => void>>();
  private readonly invokes: RecordedInvoke[] = [];

  /**
   * Register a responder for a command name. The responder is called with the typed
   * args whenever {@link invoke} is called with that name.
   */
  on<N extends IpcCommandName>(name: N, responder: CommandResponder<N>): this {
    this.responders.set(name, responder as unknown as CommandResponder<IpcCommandName>);
    return this;
  }

  /** Return an immutable snapshot of every recorded {@link invoke} call. */
  get calls(): readonly RecordedInvoke[] {
    return this.invokes;
  }

  /** Count how many times a specific command was invoked. */
  callCount(name: IpcCommandName): number {
    let total = 0;
    for (const call of this.invokes) {
      if (call.name === name) {
        total += 1;
      }
    }
    return total;
  }

  /** Return the most recent recorded invocation, or undefined if none happened. */
  lastCall(): RecordedInvoke | undefined {
    return this.invokes.at(-1);
  }

  async invoke<N extends IpcCommandName>(
    name: N,
    args: IpcCommandArgs<N>,
  ): Promise<IpcCommandResult<N>> {
    this.invokes.push({ name, args });
    const responder = this.responders.get(name);
    if (responder === undefined) {
      throw new Error(`FakeTransport: no responder registered for command "${name}"`);
    }
    const result = await responder(args);
    return result as IpcCommandResult<N>;
  }

  listen<N extends IpcEventName>(
    name: N,
    handler: (payload: IpcEventPayload<N>) => void,
  ): Unsubscribe {
    let set = this.listeners.get(name);
    if (set === undefined) {
      set = new Set();
      this.listeners.set(name, set);
    }
    const wrapped = handler as (payload: unknown) => void;
    set.add(wrapped);
    return () => {
      set?.delete(wrapped);
    };
  }

  /**
   * Push an event to every subscriber registered for a name. Used by tests to
   * simulate the host emitting `pty:data`, `pty:exit`, and similar events.
   *
   * @returns the number of handlers that received the event
   */
  emit<N extends IpcEventName>(name: N, payload: IpcEventPayload<N>): number {
    const set = this.listeners.get(name);
    if (set === undefined) {
      return 0;
    }
    let delivered = 0;
    for (const handler of [...set]) {
      handler(payload);
      delivered += 1;
    }
    return delivered;
  }

  /** Number of active listeners for an event name. Useful to assert cleanup. */
  listenerCount(name: IpcEventName): number {
    return this.listeners.get(name)?.size ?? 0;
  }
}
