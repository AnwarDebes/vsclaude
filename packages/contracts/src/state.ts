/**
 * Shared application state shapes.
 *
 * These are the cross-package data structures that the Zustand stores in the
 * renderer build on. Keeping them in contracts means the chat panel, the swarm
 * view, the motion engine, and persistence all describe a session the same way.
 */
import type { AgentEvent, ProviderId } from './agent-event.js';
import type { TodoItem } from './event-payloads.js';

/** The five ways Pixie can be presented. Remembered per user. */
export type PresentationMode = 'companion' | 'stage' | 'swarm' | 'minimal' | 'cozy';

/** An opened workspace folder. */
export interface Workspace {
  rootPath: string;
  name: string;
}

/** Lifecycle status of one agent in the delegation tree. */
export type AgentStatus = 'spawning' | 'active' | 'waiting' | 'finished' | 'error' | 'cancelled';

/** One node in the agent delegation tree, the backbone of the swarm view. */
export interface AgentNode {
  agentId: string;
  parentAgentId?: string;
  provider: ProviderId;
  /** The task label shown at this Pixie's workshop station. */
  task?: string;
  status: AgentStatus;
  startedAt: number;
  finishedAt?: number;
  /** Child agent ids this node delegated to. */
  children: string[];
  /** Running token and cost totals for this agent. */
  tokens?: { input: number; output: number; costUsd?: number };
}

/** The full delegation tree for a session. */
export interface AgentTree {
  rootAgentId: string;
  nodes: Record<string, AgentNode>;
}

/** Metadata describing a saved or active session. */
export interface SessionMeta {
  id: string;
  name: string;
  provider: ProviderId;
  model?: string;
  cwd: string;
  createdAt: number;
  updatedAt: number;
  /** A short auto-generated or user-set summary. */
  summary?: string;
}

/** A persisted session: its metadata plus the full event log to replay. */
export interface PersistedSession {
  meta: SessionMeta;
  events: AgentEvent[];
  todos?: TodoItem[];
  checkpoints?: Checkpoint[];
}

/** A checkpoint: a snapshot the user can roll back to. */
export interface Checkpoint {
  id: string;
  sessionId: string;
  label: string;
  createdAt: number;
  /** Index into the session event log this checkpoint corresponds to. */
  eventIndex: number;
  /** Opaque handle to the workspace snapshot held by the Rust core. */
  snapshotRef: string;
}

/** Sound preferences. Sound is off by default. */
export interface SoundSettings {
  enabled: boolean;
  masterVolume: number;
  typing: boolean;
  ambient: boolean;
}

/** Editor preferences applied to the Monaco editor and the diff view. */
export interface EditorSettings {
  fontSize: number;
  /** The editor font family, as a CSS font-family value. */
  fontFamily: string;
  /** Render programming ligatures in the editor font. */
  fontLigatures: boolean;
  tabSize: number;
  insertSpaces: boolean;
  /** Auto-detect tab size and spaces-vs-tabs from the file content on open. */
  detectIndentation: boolean;
  wordWrap: boolean;
  minimap: boolean;
  /** Which side of the editor the minimap sits on. */
  minimapSide: 'left' | 'right';
  /** How the minimap fills the vertical space. */
  minimapSize: 'proportional' | 'fill' | 'fit';
  lineNumbers: 'on' | 'off' | 'relative';
  /** A vertical ruler at this column, or 0 for none. */
  rulers: number;
  renderWhitespace: 'none' | 'selection' | 'all';
  /** Render control characters (such as a literal tab or escape) visibly. */
  renderControlCharacters: boolean;
  /** Render the final end-of-file newline with a trailing glyph. */
  renderFinalNewline: boolean;
  cursorStyle: 'line' | 'block' | 'underline';
  /** How the caret blinks. */
  cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';
  /** Animate the caret as it moves between positions. */
  cursorSmoothCaretAnimation: 'off' | 'explicit' | 'on';
  /** Keep at least this many lines visible above and below the caret. */
  cursorSurroundingLines: number;
  /** Line height in pixels, or 0 to derive it from the font size. */
  lineHeight: number;
  fontWeight: 'normal' | '500' | '600' | 'bold';
  /** Zoom the editor font with Ctrl and the mouse wheel. */
  mouseWheelZoom: boolean;
  /** Animate scrolling within the editor. */
  smoothScrolling: boolean;
  /** Speed multiplier when scrolling with the Alt key held. */
  fastScrollSensitivity: number;
  /** Allow scrolling past the last line of the file. */
  scrollBeyondLastLine: boolean;
  /** Show code folding controls in the gutter. */
  folding: boolean;
  /** Pin the enclosing scopes to the top of the editor while scrolling. */
  stickyScroll: boolean;
  /** Ignore trailing-whitespace-only changes in the diff editor. */
  diffIgnoreTrimWhitespace: boolean;
  /** The diff algorithm the diff editor uses. */
  diffAlgorithm: 'legacy' | 'advanced';
  /** Cap (in milliseconds) on diff computation, or 0 for no cap. */
  diffMaxComputationTime: number;
  /** Draw indentation guides. */
  indentGuides: boolean;
  /** Draw vertical guides for matching bracket pairs. */
  bracketPairGuides: boolean;
  /** Colorize matching bracket pairs by nesting depth. */
  bracketPairColorization: boolean;
  /** When the editor auto-closes brackets as you type. */
  autoClosingBrackets: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never';
  /** When the editor auto-closes quotes as you type. */
  autoClosingQuotes: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never';
  /** Whether typing a bracket or quote over a selection wraps it. */
  autoSurround: 'languageDefined' | 'quotes' | 'brackets' | 'never';
  /** When to highlight the bracket matching the one at the cursor. */
  matchBrackets: 'always' | 'near' | 'never';
  /** On save, strip trailing whitespace from every line. */
  trimTrailingWhitespace: boolean;
  /** On save, ensure the file ends with a newline. */
  insertFinalNewline: boolean;
  /** On save, collapse extra blank lines at the end of the file to one newline. */
  trimFinalNewlines: boolean;
  /** Format the whole document on save. */
  formatOnSave: boolean;
  /** Format pasted content. */
  formatOnPaste: boolean;
  /** Format a line as you finish typing it. */
  formatOnType: boolean;
}

/** User-level application settings. */
export interface AppSettings {
  themeId: string;
  presentationMode: PresentationMode;
  /** Whole-UI zoom factor (1 is 100 percent). */
  uiScale: number;
  /** Follow the OS light/dark preference, overriding themeId while on. */
  followSystemTheme: boolean;
  reducedMotion: boolean;
  colorBlindSafe: boolean;
  sound: SoundSettings;
  editor: EditorSettings;
  defaultProvider: ProviderId;
  /** Map of provider id to last-used model. */
  models: Record<string, string>;
  /** Telemetry is opt-in and off by default. */
  telemetry: boolean;
}

/** The default settings a fresh install starts from. */
export const DEFAULT_SETTINGS: AppSettings = {
  themeId: 'cozy-dark',
  presentationMode: 'companion',
  uiScale: 1,
  followSystemTheme: false,
  reducedMotion: false,
  colorBlindSafe: false,
  sound: { enabled: false, masterVolume: 0.6, typing: true, ambient: false },
  editor: {
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Cascadia Code', ui-monospace, monospace",
    fontLigatures: true,
    tabSize: 2,
    insertSpaces: true,
    detectIndentation: true,
    wordWrap: false,
    minimap: true,
    minimapSide: 'right',
    minimapSize: 'proportional',
    lineNumbers: 'on',
    rulers: 0,
    renderWhitespace: 'selection',
    renderControlCharacters: true,
    renderFinalNewline: true,
    cursorStyle: 'line',
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'off',
    cursorSurroundingLines: 0,
    lineHeight: 0,
    fontWeight: 'normal',
    mouseWheelZoom: false,
    smoothScrolling: true,
    fastScrollSensitivity: 5,
    scrollBeyondLastLine: false,
    folding: true,
    stickyScroll: true,
    diffIgnoreTrimWhitespace: true,
    diffAlgorithm: 'advanced',
    diffMaxComputationTime: 5000,
    indentGuides: true,
    bracketPairGuides: true,
    bracketPairColorization: true,
    autoClosingBrackets: 'languageDefined',
    autoClosingQuotes: 'languageDefined',
    autoSurround: 'languageDefined',
    matchBrackets: 'always',
    trimTrailingWhitespace: false,
    insertFinalNewline: false,
    trimFinalNewlines: false,
    formatOnSave: false,
    formatOnPaste: false,
    formatOnType: false,
  },
  defaultProvider: 'claude-code',
  models: {},
  telemetry: false,
};
