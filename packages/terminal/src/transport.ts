import type {
  IpcCommandName,
  IpcCommandArgs,
  IpcCommandResult,
  IpcEventName,
  IpcEventPayload,
  Unsubscribe,
} from '@vsclaude/contracts';

/**
 * A typed bridge to the host process IPC layer.
 *
 * The terminal package never speaks to the operating system directly. Instead it
 * issues commands and subscribes to events through this transport, which is fully
 * typed against the frozen {@link IpcCommandMap} and {@link IpcEventMap} contracts.
 *
 * Implementations may be backed by Electron `ipcRenderer`, a WebSocket, a worker
 * `MessagePort`, or the in-memory {@link FakeTransport} used in tests. The terminal
 * logic is agnostic to all of them.
 */
export interface Transport {
  /**
   * Invoke a request/response command on the host and await its typed result.
   *
   * @param name - the command name, a key of the IPC command map
   * @param args - the typed argument payload for that command
   * @returns a promise resolving to the typed result for that command
   */
  invoke<N extends IpcCommandName>(
    name: N,
    args: IpcCommandArgs<N>,
  ): Promise<IpcCommandResult<N>>;

  /**
   * Subscribe to a host-emitted event. The handler receives the typed payload for
   * the named event. The returned function unsubscribes the handler.
   *
   * @param name - the event name, a key of the IPC event map
   * @param handler - callback invoked with the typed payload on each emission
   * @returns an unsubscribe function that detaches the handler
   */
  listen<N extends IpcEventName>(
    name: N,
    handler: (payload: IpcEventPayload<N>) => void,
  ): Unsubscribe;
}
