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
  tabSize: number;
  insertSpaces: boolean;
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
  cursorStyle: 'line' | 'block' | 'underline';
  /** Line height in pixels, or 0 to derive it from the font size. */
  lineHeight: number;
  fontWeight: 'normal' | '500' | '600' | 'bold';
  /** Zoom the editor font with Ctrl and the mouse wheel. */
  mouseWheelZoom: boolean;
  /** Ignore trailing-whitespace-only changes in the diff editor. */
  diffIgnoreTrimWhitespace: boolean;
  /** Draw vertical guides for matching bracket pairs. */
  bracketPairGuides: boolean;
  /** On save, strip trailing whitespace from every line. */
  trimTrailingWhitespace: boolean;
  /** On save, ensure the file ends with a newline. */
  insertFinalNewline: boolean;
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
    tabSize: 2,
    insertSpaces: true,
    wordWrap: false,
    minimap: true,
    minimapSide: 'right',
    minimapSize: 'proportional',
    lineNumbers: 'on',
    rulers: 0,
    renderWhitespace: 'selection',
    cursorStyle: 'line',
    lineHeight: 0,
    fontWeight: 'normal',
    mouseWheelZoom: false,
    diffIgnoreTrimWhitespace: true,
    bracketPairGuides: true,
    trimTrailingWhitespace: false,
    insertFinalNewline: false,
  },
  defaultProvider: 'claude-code',
  models: {},
  telemetry: false,
};
