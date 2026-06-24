/**
 * @vsclaude/core-shell
 *
 * The window layout model, dockable panel tree, and command palette registry
 * for the vsclaude IDE. This package is pure TypeScript domain logic: no React,
 * no DOM, no UI runtime. The React or native integration layer consumes these
 * models later (tracked in ROADMAP.md).
 */

export {
  type SplitOrientation,
  type SplitSide,
  type PanelLeaf,
  type SplitChild,
  type PanelSplit,
  type PanelNode,
  isLeaf,
  isSplit,
  leaf,
  collectPanelIds,
  panelCount,
  hasPanel,
  splitPanel,
  removePanel,
  resizePanel,
} from './panel-tree.js';

export {
  type Command,
  type CommandMatch,
  subsequenceScore,
  scoreCommand,
  CommandRegistry,
} from './command-registry.js';

export {
  type QuickPickItem,
  type PaletteMode,
  type ParsedPaletteInput,
  scoreQuickPickItem,
  filterQuickPick,
  parsePaletteInput,
} from './quick-pick.js';

export { type StatusBarItem, orderStatusItems } from './status-bar.js';

export {
  defaultLayout,
  layoutForMode,
  isLayoutValid,
} from './presentation.js';
