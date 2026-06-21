# @vsclaude/terminal

Typed pseudo terminal (PTY) client for the vsclaude IDE. It drives a host-side
terminal over the frozen vsclaude IPC protocol with full TypeScript types, while
staying completely free of rendering concerns. This package owns the lifecycle of a
terminal session: creating the PTY, writing input, resizing, killing it, and routing
output and exit events to subscribers. It imports no xterm, no DOM, and no native
bindings, so the same logic runs in the renderer, a worker, or a test.

## What lives here

- `Transport`: a small typed bridge to the host IPC layer, keyed against the
  contract's `IpcCommandMap` and `IpcEventMap`. Real apps back it with Electron IPC,
  a socket, or a worker port.
- `TerminalSession`: the lifecycle owner for one terminal. It calls `pty.create`,
  `pty.write`, `pty.resize`, and `pty.kill`, and fans `pty:data` and `pty:exit` out to
  subscribers, filtering by the host-assigned `ptyId` so multiple terminals can share
  one transport without crosstalk.
- `FakeTransport`: an in-memory transport for tests and local development. It records
  every invocation, lets you register per-command responders, and lets you emit events
  to subscribers deterministically.

## Usage

```ts
import { TerminalSession, type Transport } from '@vsclaude/terminal';

declare const transport: Transport; // provided by the host

const session = new TerminalSession(transport);

const off = session.onData((chunk) => {
  process.stdout.write(chunk);
});
session.onExit((code) => {
  console.log('terminal exited with', code);
});

await session.open({ cwd: '/workspace', cols: 80, rows: 24 });
await session.write('npm run build\n');
await session.resize(120, 40);

// later
off();
await session.kill();
```

## Status

This is the initial logic layer: the transport contract, the session state machine,
and a fake transport for testing. The xterm rendering surface and the native PTY host
bridge (Electron or node-pty) are layered on top later and are tracked in
ROADMAP.md. The public API here is designed to remain stable as those layers land.
