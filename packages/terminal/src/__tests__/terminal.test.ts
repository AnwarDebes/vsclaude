import { describe, it, expect } from 'vitest';
import type {
  IpcCommandArgs,
  IpcCommandResult,
  IpcEventPayload,
} from '@vsclaude/contracts';
import {
  TerminalSession,
  FakeTransport,
  PTY_COMMANDS,
  PTY_EVENTS,
} from '../index.js';
import type {
  PtyCreateCommand,
  PtyDataEvent,
  PtyExitEvent,
} from '../index.js';

/**
 * Build a `pty.create` result carrying the given correlation id. The exact contract
 * shape is unknown to this layer, so we widen through `unknown` exactly as a real
 * host transport would when handing back a structured-clone payload.
 */
function createResult(ptyId: string): IpcCommandResult<PtyCreateCommand> {
  return { ptyId, id: ptyId } as unknown as IpcCommandResult<PtyCreateCommand>;
}

/** Build a `pty:data` event payload for a session id. */
function dataPayload(ptyId: string, data: string): IpcEventPayload<PtyDataEvent> {
  return { ptyId, id: ptyId, data } as unknown as IpcEventPayload<PtyDataEvent>;
}

/** Build a `pty:exit` event payload for a session id. */
function exitPayload(ptyId: string, exitCode: number): IpcEventPayload<PtyExitEvent> {
  return { ptyId, id: ptyId, exitCode } as unknown as IpcEventPayload<PtyExitEvent>;
}

/** A minimal create-args value for opening a session. */
function createArgs(): IpcCommandArgs<PtyCreateCommand> {
  return { cwd: '/workspace', cols: 80, rows: 24 } as unknown as IpcCommandArgs<PtyCreateCommand>;
}

/** Register no-op responders for every PTY command so invoke never throws. */
function wireResponders(transport: FakeTransport, ptyId: string): void {
  transport
    .on(PTY_COMMANDS.create, () => createResult(ptyId))
    .on(PTY_COMMANDS.write, () => undefined as unknown as IpcCommandResult<typeof PTY_COMMANDS.write>)
    .on(PTY_COMMANDS.resize, () => undefined as unknown as IpcCommandResult<typeof PTY_COMMANDS.resize>)
    .on(PTY_COMMANDS.kill, () => undefined as unknown as IpcCommandResult<typeof PTY_COMMANDS.kill>);
}

describe('TerminalSession over FakeTransport', () => {
  it('opens a PTY and exposes the host-assigned id', async () => {
    const transport = new FakeTransport();
    wireResponders(transport, 'pty-1');
    const session = new TerminalSession(transport);

    const result = await session.open(createArgs());

    expect(result.ptyId).toBe('pty-1');
    expect(session.id).toBe('pty-1');
    expect(session.isRunning).toBe(true);
    expect(transport.callCount(PTY_COMMANDS.create)).toBe(1);
  });

  it('routes pty:data emissions to every subscriber', async () => {
    const transport = new FakeTransport();
    wireResponders(transport, 'pty-2');
    const session = new TerminalSession(transport);
    await session.open(createArgs());

    const received: string[] = [];
    const second: string[] = [];
    session.onData((chunk) => received.push(chunk));
    session.onData((chunk) => second.push(chunk));

    const delivered = transport.emit(PTY_EVENTS.data, dataPayload('pty-2', 'hello '));
    transport.emit(PTY_EVENTS.data, dataPayload('pty-2', 'world'));

    // The session multiplexes: it registers a single transport listener and
    // fans the data out to its own subscribers, so the transport reports one.
    expect(delivered).toBe(1);
    expect(received.join('')).toBe('hello world');
    expect(second.join('')).toBe('hello world');
  });

  it('forwards write input to the pty.write command', async () => {
    const transport = new FakeTransport();
    wireResponders(transport, 'pty-3');
    const session = new TerminalSession(transport);
    await session.open(createArgs());

    await session.write('ls -la\n');

    const last = transport.lastCall();
    expect(last?.name).toBe(PTY_COMMANDS.write);
    const args = last?.args as { data?: unknown; ptyId?: unknown };
    expect(args.data).toBe('ls -la\n');
    expect(args.ptyId).toBe('pty-3');
  });

  it('ignores data emitted for a different pty id', async () => {
    const transport = new FakeTransport();
    wireResponders(transport, 'pty-4');
    const session = new TerminalSession(transport);
    await session.open(createArgs());

    const received: string[] = [];
    session.onData((chunk) => received.push(chunk));

    transport.emit(PTY_EVENTS.data, dataPayload('other-pty', 'nope'));
    transport.emit(PTY_EVENTS.data, dataPayload('pty-4', 'yes'));

    expect(received).toEqual(['yes']);
  });

  it('kill calls pty.kill, marks the session killed, and detaches listeners', async () => {
    const transport = new FakeTransport();
    wireResponders(transport, 'pty-5');
    const session = new TerminalSession(transport);
    await session.open(createArgs());

    expect(transport.listenerCount(PTY_EVENTS.data)).toBe(1);
    expect(transport.listenerCount(PTY_EVENTS.exit)).toBe(1);

    await session.kill();

    expect(transport.callCount(PTY_COMMANDS.kill)).toBe(1);
    expect(session.status).toBe('killed');
    expect(transport.listenerCount(PTY_EVENTS.data)).toBe(0);
    expect(transport.listenerCount(PTY_EVENTS.exit)).toBe(0);

    const killArgs = transport.lastCall()?.args as { ptyId?: unknown };
    expect(killArgs.ptyId).toBe('pty-5');
  });

  it('captures the exit code from pty:exit and stops reporting as running', async () => {
    const transport = new FakeTransport();
    wireResponders(transport, 'pty-6');
    const session = new TerminalSession(transport);
    await session.open(createArgs());

    let observed: number | null = -999;
    session.onExit((code) => {
      observed = code;
    });

    transport.emit(PTY_EVENTS.exit, exitPayload('pty-6', 137));

    expect(observed).toBe(137);
    expect(session.exitCode).toBe(137);
    expect(session.status).toBe('exited');
    expect(session.isRunning).toBe(false);
  });

  it('rejects writing before the session is open', async () => {
    const transport = new FakeTransport();
    wireResponders(transport, 'pty-7');
    const session = new TerminalSession(transport);

    await expect(session.write('x')).rejects.toThrow(/not running/);
    expect(transport.callCount(PTY_COMMANDS.write)).toBe(0);
  });

  it('validates resize dimensions', async () => {
    const transport = new FakeTransport();
    wireResponders(transport, 'pty-8');
    const session = new TerminalSession(transport);
    await session.open(createArgs());

    await expect(session.resize(0, 24)).rejects.toThrow(/invalid dimensions/);
    await session.resize(120, 40);

    const args = transport.lastCall()?.args as { cols?: unknown; rows?: unknown };
    expect(args.cols).toBe(120);
    expect(args.rows).toBe(40);
  });
});
