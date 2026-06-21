# @vsclaude/terminal roadmap

The current package ships the transport-agnostic logic layer. Planned layers, in order:

1. Host PTY bridge: wire `Transport` to the real host (Electron `ipcRenderer` or a
   node-pty driven worker) and validate event correlation under multiple live PTYs.
2. xterm rendering surface: a thin adapter that pipes `TerminalSession.onData` into an
   `xterm.js` instance and forwards keystrokes and resize events back through the
   session. Kept in a separate entry point so the logic layer stays UI-free.
3. Scrollback and search: buffered scrollback, link detection, and find-in-terminal
   built on top of the rendering surface.
4. Theming: map the vsclaude `DesignTokens` color set onto the terminal palette so the
   terminal matches the active `Theme`.

Until those land, this package is consumable on its own for orchestration, testing,
and headless use cases.
