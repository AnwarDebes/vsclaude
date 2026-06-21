/**
 * The typed bridge from the renderer to the Tauri Rust core.
 *
 * Every call and every event is checked against the IPC contract in
 * `@vsclaude/contracts`, so the boundary is statically safe end to end. The
 * Rust side exposes commands in snake_case, so we translate the logical dotted
 * names (for example `fs.readDir`) into Tauri command names (`fs_read_dir`).
 */
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type {
  IpcCommandName,
  IpcCommandArgs,
  IpcCommandResult,
  IpcEventName,
  IpcEventPayload,
} from '@vsclaude/contracts';

/** `fs.readDir` becomes `fs_read_dir`, matching the Rust command names. */
export function toTauriCommand(name: IpcCommandName): string {
  return name
    .replace(/\./g, '_')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase();
}

/** Invoke a core command with fully typed arguments and result. */
export async function call<N extends IpcCommandName>(
  name: N,
  args: IpcCommandArgs<N>,
): Promise<IpcCommandResult<N>> {
  return invoke(toTauriCommand(name), args as Record<string, unknown>) as Promise<
    IpcCommandResult<N>
  >;
}

/** Subscribe to a core event. Returns an unlisten function. */
export async function on<N extends IpcEventName>(
  name: N,
  handler: (payload: IpcEventPayload<N>) => void,
): Promise<UnlistenFn> {
  return listen<IpcEventPayload<N>>(name, (event) => handler(event.payload));
}
