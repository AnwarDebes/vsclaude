# @vsclaude/editor

Pure, dependency free domain logic for the Monaco-backed editor surface of the vsclaude IDE. This package turns a flat list of filesystem entries into a normalized, sorted file tree, provides the helpers a virtualized explorer needs to render and expand that tree, and ships a `TabManager` that owns the open documents and active-tab semantics. There is no Monaco, React, or DOM dependency here: this is the model layer the view sits on top of.

## What lives here

- `buildFileTree(entries)`: builds a nested `TreeNode[]` from `FsEntry[]`, synthesizing intermediate directories and sorting siblings with directories first, then alphabetically (case insensitive, then case sensitive as a stable tie break).
- `flattenVisible(roots, expanded)` and `toggleExpanded(expanded, path)`: pure helpers that produce the ordered, pre-order list of `VisibleRow` for a virtualized list given the set of expanded directory paths. `collectDirectoryPaths` gives you an "expand all" set.
- `TabManager`: an `openTab` / `closeTab` / `activate` / `getActive` / `list` model with correct active-tab fallback. Closing the active tab promotes the neighbor that takes its slot; closing the last tab clears the active state.
- `baseName`, `compareNodes`: small utilities shared by the above.

## Usage

```ts
import {
  buildFileTree,
  flattenVisible,
  toggleExpanded,
  TabManager,
} from '@vsclaude/editor';
import type { FsEntry } from '@vsclaude/contracts';

const entries: FsEntry[] = [
  { path: 'src/components/Button.tsx', name: 'Button.tsx', kind: 'file' },
  { path: 'src/index.ts', name: 'index.ts', kind: 'file' },
  { path: 'README.md', name: 'README.md', kind: 'file' },
];

const tree = buildFileTree(entries);

let expanded = new Set<string>();
expanded = toggleExpanded(expanded, 'src');

// Rows for a virtualized renderer, in display order.
const rows = flattenVisible(tree, expanded);

const tabs = new TabManager();
tabs.openTab('src/index.ts');
tabs.openTab('README.md');
tabs.closeTab('README.md'); // active falls back to src/index.ts
const active = tabs.getActive(); // { path: 'src/index.ts', label: 'index.ts' }
```

## Status

This is the initial logic layer. It is fully tested with Vitest and has no UI dependencies. The Monaco editor wiring and the React or native integration (file explorer panel, tab strip components, live document syncing) are tracked in ROADMAP.md and land in a later milestone.
