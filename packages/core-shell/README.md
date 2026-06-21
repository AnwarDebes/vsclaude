# @vsclaude/core-shell

The core shell holds the window layout brain of the vsclaude IDE: an immutable, dockable panel tree and the command palette registry that powers fuzzy command lookup. It is pure TypeScript domain logic with no React, DOM, or rendering dependency, so the same models can drive a web renderer, a native shell, or a test harness without change.

## What lives here

- **Panel tree** (`panel-tree.ts`): a binary split layout of rows and columns. Pure functions `splitPanel`, `removePanel`, and `resizePanel` return brand new trees, plus helpers like `collectPanelIds`, `hasPanel`, and `panelCount`. Splits collapse automatically when they drop to one child, and same orientation splits fold instead of nesting.
- **Command registry** (`command-registry.ts`): `CommandRegistry` with `register`, `unregister`, `list`, `run`, and a dependency free `fuzzyFind` that ranks commands by a subsequence match score over each command's title and keywords.
- **Presentation helpers** (`presentation.ts`): translate the frozen `@vsclaude/contracts` surface (presentation modes) into concrete layouts via `defaultLayout`, `layoutForMode`, and `isLayoutValid`.

## Usage

```ts
import {
  CommandRegistry,
  leaf,
  splitPanel,
  resizePanel,
} from '@vsclaude/core-shell';

// Build a layout: start with one editor panel, split off a terminal below it.
let layout = leaf('editor');
layout = splitPanel(layout, 'editor', 'terminal', 'column', 'after');
layout = resizePanel(layout, 'editor', 1.6); // give the editor more room

// Wire up the command palette.
const commands = new CommandRegistry();
commands.register({ id: 'open', title: 'Open File', run: () => openFile() });
commands.register({
  id: 'theme',
  title: 'Toggle Theme',
  keywords: ['dark', 'light'],
  run: () => toggleTheme(),
});

const ranked = commands.fuzzyFind('dark');
// ranked[0].command.id === 'theme'
```

## Status

This is the initial logic layer: the layout model and command registry are fully implemented and tested with Vitest. The React or native integration that renders these models into real draggable, resizable panels is tracked in ROADMAP.md and arrives in a later milestone.
