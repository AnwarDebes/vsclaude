import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { AppSettings, PresentationMode } from '@vsclaude/contracts';
import { DEFAULT_SETTINGS } from '@vsclaude/contracts';
import {
  CommandRegistry,
  summarizeDiagnostics,
  type QuickPickItem,
  type StatusBarItem,
} from '@vsclaude/core-shell';
import { diffSidesForCode, type GitFileChange } from '@vsclaude/git';
import { basePathName, joinPath, type TreeNode } from '@vsclaude/editor';
import { bundledThemeIds } from '@vsclaude/design-system';
import { languageForPath } from './lib/language';
import { languageLabel, detectLanguageFromContent, SELECTABLE_LANGUAGES } from './lib/languages';
import { readFile } from './workspace/fsClient';
import { gitHeadFile, isTauri, readFileBase64 } from './lib/tauri';
import { useSession } from './session/useSession';
import { useLiveProvider } from './session/useLiveProvider';
import { useWorkspace, loadRootPaths } from './workspace/useWorkspace';
import { useFileIndex } from './workspace/useFileIndex';
import {
  gotoLine,
  insertSnippet,
  runEditorAction,
  setEditorLanguage,
  setEditorEol,
  currentPosition,
} from './lib/editor-bridge';
import { navBack, navForward } from './lib/nav-history';
import { SnippetsModal } from './components/SnippetsModal';
import { setEditorSettings } from './lib/editor-settings';
import { applyMonacoTheme } from './lib/monaco-theme';
import { EDITOR_COMMANDS } from './lib/editor-commands';
import { useDiagnostics } from './lib/useDiagnostics';
import { demoFiles } from './session/demo-session';
import { parseActiveFile } from './lib/active-file';
import { parseBottomPanel, type BottomPanel, type RestorablePanel } from './lib/layout-state';
import { demoContentFor, demoFileContents } from './session/demo-files';
import { buildWorkspaceSymbols, outlineSymbols } from './lib/workspace-symbols';
import { applyTheme, loadAppSettings, saveAppSettings } from './lib/theme';
import { PixieStage } from './components/PixieStage';
import { PixieActionSprite } from './components/ActionIcon';
import { SettingsBar } from './components/SettingsBar';
import { MenuBar } from './components/MenuBar';
import { CommandPalette, openPalette } from './components/CommandPalette';
import { StatusBar, useEditorStatus, useGitStatus } from './components/StatusBar';
import { ActivityBar } from './components/ActivityBar';
import { activeViewFor } from './lib/activity-view';
import { Breadcrumbs } from './components/Breadcrumbs';
import { ProblemsPanel } from './components/ProblemsPanel';
import { OutputPanel } from './components/OutputPanel';
import { OutlinePanel } from './components/OutlinePanel';
import { NarrationLog } from './components/NarrationLog';
import { appendLog } from './lib/output-log';
import { SearchPanel } from './components/SearchPanel';
import { SourceControlPanel } from './components/SourceControlPanel';
import { GitHistoryModal } from './components/GitHistoryModal';
import { GitTagsModal } from './components/GitTagsModal';
import { GitRemotesModal } from './components/GitRemotesModal';
import { GitStashModal } from './components/GitStashModal';
import { gitLog, type GitCommit } from './lib/tauri';
import { SettingsPanel } from './components/SettingsPanel';
import { SettingsJsonModal } from './components/SettingsJsonModal';
import { ThemeExportModal } from './components/ThemeExportModal';
import { ThemeImportModal } from './components/ThemeImportModal';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import { WelcomePanel } from './components/WelcomePanel';
import { ReleaseNotes } from './components/ReleaseNotes';
import { NotificationCenter } from './components/NotificationCenter';
import { NotificationToast } from './components/NotificationToast';
import { addNotification, getNotifications, subscribeNotifications } from './lib/notifications';
import { filesWithProblems } from './lib/problem-decorations';
import { welcomeQuickActions, type WelcomeActionId } from './lib/welcome';
import { DiffModal, type DiffTarget } from './components/DiffModal';
import { MarkdownPreview, type MarkdownTarget } from './components/MarkdownPreview';
import { ImagePreview, type ImageTarget } from './components/ImagePreview';
import { isImagePath, isSvgPath, svgDataUrl, rasterImageMime } from './lib/preview';
import { MediaPlayer, type MediaTarget } from './components/MediaPlayer';
import { isMediaPath, mediaKind, mediaMime } from './lib/media';
import { HexView, type HexTarget } from './components/HexView';
import { base64ToBytes } from './lib/hex';
import { MergeConflictBar } from './components/MergeConflictBar';
import { Sash } from './components/Sash';
import {
  loadSidebarWidth,
  loadBottomHeight,
  SIDEBAR_MIN,
  SIDEBAR_MAX,
  SIDEBAR_DEFAULT,
  BOTTOM_MIN,
  BOTTOM_MAX,
  BOTTOM_DEFAULT,
} from './lib/sash';
import { findConflicts, resolveConflict, type Conflict, type ConflictChoice } from './lib/conflicts';
import { ProcessInfoModal } from './components/ProcessInfoModal';
import { AccessibilityHelp } from './components/AccessibilityHelp';
import { themeForSystem } from './lib/system-theme';
import { DiffReview } from './components/DiffReview';
import { Narration } from './components/Narration';
import { ExplorerPanel } from './panels/ExplorerPanel';
import { EditorPanel } from './panels/EditorPanel';
import { WorkspaceExplorer } from './components/WorkspaceExplorer';
import { WorkspaceEditor } from './components/WorkspaceEditor';
import { SwarmPanel } from './panels/SwarmPanel';
import { TimelinePanel } from './panels/TimelinePanel';
import { TokenPanel } from './panels/TokenPanel';
import { TerminalTabs, requestNewTerminal, requestRunInTerminal } from './components/TerminalTabs';
import { detectNpmTasks, parseTasksJson, resolveTaskChain, type NpmTask } from './lib/tasks';
import { substituteVariables } from './lib/variables';
import { isExcludedPath } from './lib/excludes';
import { untitledName } from './lib/untitled';

const STATE_LABELS: Record<string, string> = {
  idle: 'resting',
  greeting: 'saying hello',
  thinking: 'thinking',
  planning: 'planning',
  reading: 'reading',
  searching: 'searching',
  web: 'on the web',
  typing: 'writing code',
  running: 'running',
  building: 'building',
  debugging: 'debugging',
  git: 'using git',
  spawning: 'delegating',
  waiting: 'waiting',
  success: 'celebrating',
  confused: 'puzzled',
  sleeping: 'resting',
};

/**
 * The vsclaude shell: a cozy, multi-panel IDE driven end to end by the real
 * packages. The motion mapper drives Pixie, the agent runtime builds the swarm
 * tree, the chat builder drives the timeline, and the design system themes it.
 * Presentation modes rearrange the room; the command palette runs everything.
 */
/** The demo file paths, used to validate a persisted active file before restoring it. */
const DEMO_FILE_PATHS = demoFiles.filter((f) => f.kind === 'file').map((f) => f.path);

export function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings());
  const [openFile, setOpenFile] = useState(() =>
    parseActiveFile(localStorage.getItem('vsclaude.activeFile'), DEMO_FILE_PATHS, 'src/auth/login-form.tsx'),
  );
  const [editedContents, setEditedContents] = useState<Record<string, string>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  // The open bottom panel is persisted so a reload restores it (see lib/layout-state.ts).
  const restoredBottomPanel = parseBottomPanel(localStorage.getItem('vsclaude.bottomPanel'));
  const [bottomPanel, setBottomPanel] = useState<BottomPanel>(restoredBottomPanel);
  // The last non-hidden bottom panel, so Toggle Panel (Ctrl+J) can restore it. Seed it
  // from the restored panel so Ctrl+J after a reload reopens the same one.
  const lastBottomPanelRef = useRef<RestorablePanel>(
    restoredBottomPanel === 'none' ? 'problems' : restoredBottomPanel,
  );
  const [gitNonce, setGitNonce] = useState(0);
  const [diffTarget, setDiffTarget] = useState<DiffTarget | null>(null);
  const [markdownTarget, setMarkdownTarget] = useState<MarkdownTarget | null>(null);
  const [imageTarget, setImageTarget] = useState<ImageTarget | null>(null);
  const [mediaTarget, setMediaTarget] = useState<MediaTarget | null>(null);
  const [hexTarget, setHexTarget] = useState<HexTarget | null>(null);
  const [processInfoOpen, setProcessInfoOpen] = useState(false);
  const [snippetsOpen, setSnippetsOpen] = useState(false);
  const [a11yHelpOpen, setA11yHelpOpen] = useState(false);
  const [gitHistory, setGitHistory] = useState<GitCommit[] | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [remotesOpen, setRemotesOpen] = useState(false);
  const [stashesOpen, setStashesOpen] = useState(false);
  const [npmTasks, setNpmTasks] = useState<NpmTask[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsJsonOpen, setSettingsJsonOpen] = useState(false);
  const [themeExportOpen, setThemeExportOpen] = useState(false);
  const [themeImportOpen, setThemeImportOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  // Session-scoped read-only toggle for the active editor (VS Code's Toggle Active
  // Editor Read-only): Monaco rejects edits while on.
  const [editorReadOnly, setEditorReadOnly] = useState(false);
  // Whether the bottom dock is maximized to fill the editor area (VS Code's Toggle
  // Maximized Panel). Drives data-bottom-maximized, which overrides --bottom-height.
  const [bottomMaximized, setBottomMaximized] = useState(false);
  // Whether the document is in OS full screen (tracked from the real event so the
  // attribute reflects actual state, not just intent).
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const [sidebarHidden, setSidebarHidden] = useState(
    () => localStorage.getItem('vsclaude.sidebarHidden') === 'true',
  );
  const untitledCounter = useRef(0);
  const live = useLiveProvider();
  const { available: liveAvailable, start: liveStart } = live;
  const usingLive = live.events.length > 0;
  const session = useSession(usingLive ? live.events : undefined, { live: usingLive });
  const { playing, setPlaying, restart } = session;
  const ws = useWorkspace();
  const hasWorkspace = ws.roots.length > 0;

  const rootPaths = useMemo(() => ws.roots.map((r) => r.path), [ws.roots]);
  const fileIndex = useFileIndex(rootPaths);

  // The demo file list, shaped as quick-pick items, so Ctrl or Cmd plus P works
  // in the browser demo before any real folder is open.
  const demoFileItems = useMemo<QuickPickItem[]>(
    () =>
      demoFiles
        .filter((f) => f.kind === 'file' && !isExcludedPath(f.path))
        .map((f) => {
          const slash = f.path.lastIndexOf('/');
          return {
            id: f.path,
            label: f.name,
            description: slash >= 0 ? f.path.slice(0, slash) : '',
            keywords: [f.path],
          };
        }),
    [],
  );

  const paletteFiles = hasWorkspace ? fileIndex.items : demoFileItems;

  // The workspace-symbol index for the `#` palette mode. Built from the demo file
  // contents; a real workspace would need the core to supply file bodies.
  const workspaceSymbolIndex = useMemo(
    () => (hasWorkspace ? [] : buildWorkspaceSymbols(demoFileContents)),
    [hasWorkspace],
  );

  const openFileFromPalette = useCallback(
    (path: string) => {
      if (hasWorkspace) void ws.openFile(path);
      else setOpenFile(path);
      // Make sure the chosen file is actually visible: drop into an editor mode
      // if the current mode does not show the editor.
      setSettings((s) =>
        s.presentationMode === 'companion' || s.presentationMode === 'cozy'
          ? s
          : { ...s, presentationMode: 'companion' },
      );
    },
    [hasWorkspace, ws],
  );

  const editorStatus = useEditorStatus();
  const gitSummary = useGitStatus(hasWorkspace ? ws.roots[0]?.path ?? null : null, gitNonce);
  const diagnostics = useDiagnostics();
  const diagnosticCounts = summarizeDiagnostics(diagnostics);
  const fileProblems = filesWithProblems(diagnostics);

  const openProblem = useCallback(
    (resource: string, line: number, column: number) => {
      openFileFromPalette(resource);
      gotoLine(line, column);
    },
    [openFileFromPalette],
  );

  // Open a workspace symbol (# in the palette) and jump to its line. Same-file jumps
  // are immediate; cross-file jumps stash the target line and let EditorPanel reveal
  // it once the new model is shown (revealLine below), avoiding the model-swap race.
  const [revealTarget, setRevealTarget] = useState<{ path: string; line: number } | null>(null);
  const openSymbol = useCallback(
    (path: string, line: number) => {
      if (path === openFile) {
        gotoLine(line, 1);
      } else {
        setRevealTarget({ path, line });
        openFileFromPalette(path);
      }
    },
    [openFile, openFileFromPalette],
  );
  // Stable so EditorPanel's reveal effect does not re-run every render.
  const clearRevealTarget = useCallback(() => setRevealTarget(null), []);

  // Open a Source Control file's diff: its committed version against the working
  // tree. Added or untracked files have no HEAD side; deleted files have no
  // working side (diffSidesForCode decides), and a missing side reads as empty.
  const openScmDiff = useCallback(
    async (change: GitFileChange) => {
      const repo = hasWorkspace ? ws.roots[0]?.path ?? null : null;
      if (!repo) return;
      const sides = diffSidesForCode(change.code);
      let original = '';
      let modified = '';
      if (sides.head) {
        try {
          original = await gitHeadFile(repo, change.path);
        } catch {
          original = '';
        }
      }
      if (sides.working) {
        try {
          modified = (await readFile(joinPath(repo, change.path))).content;
        } catch {
          modified = '';
        }
      }
      setDiffTarget({
        name: basePathName(change.path),
        original,
        modified,
        language: languageForPath(change.path),
        subtitle: 'working tree vs HEAD',
      });
    },
    [hasWorkspace, ws.roots],
  );

  // Compare the active editor's unsaved changes against what is on disk. Works in
  // the native workspace (draft vs disk) and in the browser demo (edits vs the
  // bundled content), so it is reachable everywhere.
  const compareWithSaved = useCallback(() => {
    if (hasWorkspace) {
      const doc = ws.activeDoc;
      if (!doc) return;
      setDiffTarget({
        name: basePathName(doc.path),
        original: doc.disk,
        modified: doc.draft,
        language: languageForPath(doc.path),
        subtitle: 'unsaved changes vs disk',
      });
    } else {
      const saved = demoContentFor(openFile);
      setDiffTarget({
        name: basePathName(openFile),
        original: saved,
        modified: editedContents[openFile] ?? saved,
        language: languageForPath(openFile),
        subtitle: 'unsaved changes vs saved',
      });
    }
  }, [hasWorkspace, ws.activeDoc, openFile, editedContents]);

  // Select-for-compare: stash the active file, then diff a second file against it.
  const [compareBase, setCompareBase] = useState<{ name: string; content: string } | null>(null);
  const activeFileSnapshot = useCallback(() => {
    if (hasWorkspace) {
      const doc = ws.activeDoc;
      if (!doc) return null;
      return { name: basePathName(doc.path), content: doc.draft, language: languageForPath(doc.path) };
    }
    return {
      name: basePathName(openFile),
      content: editedContents[openFile] ?? demoContentFor(openFile),
      language: languageForPath(openFile),
    };
  }, [hasWorkspace, ws.activeDoc, openFile, editedContents]);
  const selectForCompare = useCallback(() => {
    const snap = activeFileSnapshot();
    if (snap) setCompareBase({ name: snap.name, content: snap.content });
  }, [activeFileSnapshot]);
  const compareWithSelected = useCallback(() => {
    const snap = activeFileSnapshot();
    if (!snap || !compareBase) return;
    setDiffTarget({
      name: `${compareBase.name} vs ${snap.name}`,
      original: compareBase.content,
      modified: snap.content,
      language: snap.language,
      subtitle: 'selected for compare',
    });
  }, [activeFileSnapshot, compareBase]);

  const notifications = useSyncExternalStore(subscribeNotifications, getNotifications, getNotifications);

  const statusItems = useMemo<StatusBarItem[]>(() => {
    const items: StatusBarItem[] = [];
    const counts = summarizeDiagnostics(diagnostics);
    const hasProblems = counts.error > 0 || counts.warning > 0;
    items.push({
      id: 'problems',
      side: 'left',
      priority: 90,
      text: hasProblems ? `${counts.error} errors, ${counts.warning} warnings` : 'No Problems',
      tooltip: 'Problems (Ctrl or Cmd plus Shift plus M)',
      ariaLabel: `${counts.error} errors, ${counts.warning} warnings. Toggle the Problems panel.`,
      command: 'view-problems',
    });
    if (gitSummary) {
      const sync =
        gitSummary.ahead || gitSummary.behind ? ` +${gitSummary.ahead}/-${gitSummary.behind}` : '';
      items.push({
        id: 'git.branch',
        side: 'left',
        priority: 100,
        text: `${gitSummary.branch}${sync}`,
        tooltip: `Git: ${gitSummary.changes} changed file${gitSummary.changes === 1 ? '' : 's'}`,
        ariaLabel: `Branch ${gitSummary.branch}, ${gitSummary.changes} changes. Open review.`,
        command: 'review-changes',
      });
    }
    if (hasWorkspace) {
      const first = ws.roots[0];
      if (first) {
        const extra = ws.roots.length > 1 ? ` +${ws.roots.length - 1}` : '';
        items.push({
          id: 'workspace.name',
          side: 'left',
          priority: 50,
          text: `${first.name}${extra}`,
          ariaLabel: `Workspace ${first.name}`,
        });
      }
    }
    if (editorStatus) {
      if (editorStatus.selectionCount > 0) {
        items.push({
          id: 'editor.selection',
          side: 'right',
          priority: 60,
          text: `(${editorStatus.selectionCount} selected)`,
          ariaLabel: `${editorStatus.selectionCount} characters selected`,
        });
      }
      items.push({
        id: 'editor.position',
        side: 'right',
        priority: 50,
        text: `Ln ${editorStatus.line}, Col ${editorStatus.column}`,
        tooltip: 'Go to Line/Column',
        command: 'go-to-line',
        ariaLabel: `Line ${editorStatus.line}, column ${editorStatus.column}. Go to line.`,
      });
      items.push({
        id: 'editor.indent',
        side: 'right',
        priority: 40,
        text: editorStatus.indent.insertSpaces
          ? `Spaces: ${editorStatus.indent.tabSize}`
          : `Tab Size: ${editorStatus.indent.tabSize}`,
        tooltip: 'Change Indentation',
        command: 'change-indentation',
        ariaLabel: editorStatus.indent.insertSpaces
          ? `Indentation, ${editorStatus.indent.tabSize} spaces. Change indentation.`
          : `Indentation, tab size ${editorStatus.indent.tabSize}. Change indentation.`,
      });
      items.push({
        id: 'editor.eol',
        side: 'right',
        priority: 30,
        text: editorStatus.eol,
        tooltip: 'Select End of Line Sequence',
        command: 'change-eol',
        ariaLabel: `End of line ${editorStatus.eol}. Change end of line sequence.`,
      });
      items.push({
        id: 'editor.language',
        side: 'right',
        priority: 20,
        text: languageLabel(editorStatus.language),
        tooltip: 'Select Language Mode',
        command: 'change-language',
        ariaLabel: `Language ${languageLabel(editorStatus.language)}. Change language mode.`,
      });
    }
    items.push({
      id: 'notifications',
      side: 'right',
      priority: 5,
      text: notifications.length > 0 ? `Notifications: ${notifications.length}` : 'Notifications',
      tooltip: 'Show notifications',
      ariaLabel: `${notifications.length} notifications. Show the notification center.`,
      command: 'show-notifications',
    });
    return items;
  }, [editorStatus, gitSummary, diagnostics, hasWorkspace, ws.roots, notifications]);

  const welcomeActions = useMemo(
    () => welcomeQuickActions({ canOpenFolder: ws.available, hasWorkspace, liveAvailable }),
    [ws.available, hasWorkspace, liveAvailable],
  );

  // On the native app's first run with no folder, greet the user with the Welcome
  // page so they have an obvious Open Folder path instead of the in-memory demo
  // content. Gated to the native shell (the browser demo and e2e are unaffected) and
  // to a genuinely empty persisted workspace, read synchronously so it does not race
  // the asynchronous root restore (a returning user is never greeted on every launch).
  // Mount-only: the persisted-roots check is the source of truth for a fresh run.
  useEffect(() => {
    if (isTauri() && loadRootPaths().length === 0) {
      setWelcomeOpen(true);
    }
  }, []);

  const onWelcomeAction = useCallback(
    (id: WelcomeActionId) => {
      setWelcomeOpen(false);
      switch (id) {
        case 'open-folder':
          void ws.openFolder();
          break;
        case 'new-file': {
          const root = ws.roots[0];
          if (root) {
            const name = window.prompt('New file name', 'untitled.ts');
            if (name) void ws.newFile(root.path, name);
          }
          break;
        }
        case 'open-settings':
          setSettingsOpen(true);
          break;
        case 'open-shortcuts':
          setShortcutsOpen(true);
          break;
        case 'run-agent': {
          const prompt = window.prompt('What should the agent do?', 'Add a validated login form with tests.');
          if (prompt) void liveStart(prompt);
          break;
        }
      }
    },
    [ws, liveStart],
  );

  useEffect(() => {
    applyTheme(settings);
    saveAppSettings(settings);
    setEditorSettings(settings.editor);
    applyMonacoTheme(settings);
  }, [settings]);

  // Detect npm scripts from the open workspace so they appear as Run Task commands.
  useEffect(() => {
    const repo = hasWorkspace ? ws.roots[0]?.path ?? null : null;
    if (!ws.available || !repo) {
      setNpmTasks([]);
      return;
    }
    let cancelled = false;
    void Promise.allSettled([
      readFile(`${repo}/package.json`),
      readFile(`${repo}/.vscode/tasks.json`),
    ]).then(([pkg, tasksJson]) => {
      if (cancelled) return;
      const npm = pkg.status === 'fulfilled' ? detectNpmTasks(pkg.value.content) : [];
      const vscode = tasksJson.status === 'fulfilled' ? parseTasksJson(tasksJson.value.content) : [];
      setNpmTasks([...npm, ...vscode]);
    });
    return () => {
      cancelled = true;
    };
  }, [hasWorkspace, ws.available, ws.roots]);

  // Follow the OS light/dark preference while Follow System Theme is on.
  useEffect(() => {
    if (!settings.followSystemTheme) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () =>
      setSettings((s) => ({
        ...s,
        themeId: themeForSystem(media.matches, s.preferredDarkTheme, s.preferredLightTheme),
      }));
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [settings.followSystemTheme, settings.preferredDarkTheme, settings.preferredLightTheme]);

  // Notable events flow to the Output channels: general logs to Log, window
  // lifecycle to Window, so the panel's channel selector has more than one entry.
  useEffect(() => {
    appendLog('vsclaude ready.');
    appendLog('Renderer window opened.', 'info', 'Window');
  }, []);
  useEffect(() => {
    if (ws.error) {
      appendLog(`Error: ${ws.error}`, 'error');
      addNotification('error', ws.error);
    }
  }, [ws.error]);

  // The bottom drawer shortcuts, matching VS Code: Ctrl or Cmd plus Shift plus M
  // for Problems and plus Shift plus F for Search. One slot, so each toggles.
  // A ref to the latest command registry lets this stable (mount-once) key handler
  // invoke registry commands without re-subscribing when their closures change.
  const registryRef = useRef<CommandRegistry | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Escape leaves Zen mode (a no-op when not in it).
        setZenMode(false);
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === ',') {
        e.preventDefault();
        setSettingsOpen((o) => !o);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarHidden((h) => !h);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setBottomPanel((p) => {
          if (p !== 'none') {
            lastBottomPanelRef.current = p;
            return 'none';
          }
          return lastBottomPanelRef.current;
        });
        return;
      }
      // Editor navigation history: Alt+Left goes back, Alt+Right goes forward.
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        const cur = currentPosition();
        const previous = cur ? navBack(cur) : null;
        if (previous) gotoLine(previous.line, previous.column, false);
        return;
      }
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.key === 'ArrowRight') {
        e.preventDefault();
        const cur = currentPosition();
        const next = cur ? navForward(cur) : null;
        if (next) gotoLine(next.line, next.column, false);
        return;
      }
      // F11 toggles OS full screen via the Fullscreen API (works in the browser demo
      // and the Tauri webview); no modifiers.
      if (e.key === 'F11' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        if (document.fullscreenElement) {
          void document.exitFullscreen().catch(() => {});
        } else {
          void document.documentElement.requestFullscreen().catch(() => {});
        }
        return;
      }
      // F6 cycles focus through the main regions (Shift+F6 reverses), like VS Code.
      if (e.key === 'F6' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const regions = ['.activity-bar', 'nav[aria-label="Files"]', '.app-center', '.app-bottom', '.status-bar']
          .map((selector) => document.querySelector(selector))
          .filter((el): el is HTMLElement => el instanceof HTMLElement);
        if (regions.length === 0) return;
        e.preventDefault();
        const FOCUSABLE =
          'button:not([disabled]), a[href], input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])';
        const current = regions.findIndex((region) => region.contains(document.activeElement));
        const step = e.shiftKey ? -1 : 1;
        // Walk to the next region that actually has a focusable child, so empty regions
        // (for example the PixieStage or the minimal narration footer) are skipped
        // rather than swallowing focus. Stop after a full lap if nothing is focusable.
        let pos = current === -1 ? (step === 1 ? -1 : regions.length) : current;
        for (let i = 0; i < regions.length; i += 1) {
          pos = (pos + step + regions.length) % regions.length;
          const focusable = regions[pos]?.querySelector<HTMLElement>(FOCUSABLE);
          if (focusable) {
            focusable.focus();
            break;
          }
        }
        return;
      }
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey) return;
      const key = e.key.toLowerCase();
      if (key === 'm') {
        e.preventDefault();
        setBottomPanel((p) => (p === 'problems' ? 'none' : 'problems'));
      } else if (key === 'f') {
        e.preventDefault();
        setBottomPanel((p) => (p === 'search' ? 'none' : 'search'));
      } else if (key === 'g') {
        e.preventDefault();
        setBottomPanel((p) => (p === 'scm' ? 'none' : 'scm'));
      } else if (key === 'u') {
        e.preventDefault();
        setBottomPanel((p) => (p === 'output' ? 'none' : 'output'));
      } else if (key === 'b') {
        // Ctrl/Cmd+Shift+B runs the build task (VS Code's Tasks: Run Build Task).
        e.preventDefault();
        registryRef.current?.get('tasks-run-build')?.run();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const registry = useMemo(() => {
    const r = new CommandRegistry();
    r.register({
      id: 'play',
      title: playing ? 'Pause the session' : 'Play the session',
      keywords: ['pause', 'resume', 'run'],
      run: () => setPlaying(!playing),
    });
    r.register({ id: 'restart', title: 'Replay the session', keywords: ['restart'], run: restart });
    r.register({
      id: 'quick-open-file',
      title: 'Go to File',
      keywords: ['open', 'file', 'quick', 'find', 'ctrl p'],
      keybinding: 'Ctrl+P',
      run: () => openPalette('files'),
    });
    r.register({
      id: 'show-commands',
      title: 'Show All Commands',
      keywords: ['command', 'palette'],
      keybinding: 'Ctrl+K',
      run: () => openPalette('commands'),
    });
    r.register({
      id: 'go-to-line',
      title: 'Go to Line/Column',
      keywords: ['line', 'column', 'jump', 'goto'],
      keybinding: 'Ctrl+G',
      run: () => openPalette('files', ':'),
    });
    r.register({
      id: 'view-problems',
      title: 'View: Problems',
      keywords: ['problems', 'errors', 'warnings', 'diagnostics'],
      keybinding: 'Ctrl+Shift+M',
      run: () => setBottomPanel((p) => (p === 'problems' ? 'none' : 'problems')),
    });
    r.register({
      id: 'view-search',
      title: 'Search: Find in Files',
      keywords: ['search', 'find', 'files', 'grep', 'ripgrep'],
      keybinding: 'Ctrl+Shift+F',
      run: () => setBottomPanel((p) => (p === 'search' ? 'none' : 'search')),
    });
    r.register({
      id: 'view-scm',
      title: 'View: Source Control',
      keywords: ['git', 'source', 'control', 'scm', 'stage', 'commit', 'branch'],
      keybinding: 'Ctrl+Shift+G',
      run: () => setBottomPanel((p) => (p === 'scm' ? 'none' : 'scm')),
    });
    r.register({
      id: 'compare-saved',
      title: 'Compare with Saved',
      keywords: ['diff', 'compare', 'changes', 'saved', 'disk'],
      run: compareWithSaved,
    });
    r.register({
      id: 'select-for-compare',
      title: 'File: Select for Compare',
      keywords: ['diff', 'compare', 'select', 'base', 'file'],
      run: selectForCompare,
    });
    r.register({
      id: 'compare-with-selected',
      title: 'File: Compare with Selected',
      keywords: ['diff', 'compare', 'selected', 'against', 'file'],
      run: compareWithSelected,
    });
    r.register({
      id: 'markdown-preview',
      title: 'Markdown: Open Preview',
      keywords: ['markdown', 'md', 'preview', 'render'],
      run: () => {
        const path = hasWorkspace ? ws.activePath : openFile;
        if (!path || !path.toLowerCase().endsWith('.md')) {
          addNotification('info', 'Open a Markdown file to preview it.');
          return;
        }
        const md = hasWorkspace
          ? ws.activeDoc?.draft ?? ''
          : editedContents[openFile] ?? demoContentFor(openFile);
        setMarkdownTarget({ name: basePathName(path), markdown: md });
      },
    });
    r.register({
      id: 'image-preview',
      title: 'Image: Open Preview',
      keywords: ['image', 'svg', 'png', 'preview', 'picture'],
      run: async () => {
        const path = hasWorkspace ? ws.activePath : openFile;
        if (!path || !isImagePath(path)) {
          addNotification('info', 'Open an image file to preview it.');
          return;
        }
        const content = hasWorkspace
          ? ws.activeDoc?.draft ?? ''
          : editedContents[openFile] ?? demoContentFor(openFile);
        // SVG is text and is wrapped in a data URL. A raster source is a data URL:
        // the browser demo stores one; natively we read the file's bytes as base64
        // (fs_read_file_base64), since the text file read rejects binary.
        let src: string;
        if (isSvgPath(path)) {
          src = svgDataUrl(content);
        } else if (content.startsWith('data:')) {
          src = content;
        } else if (isTauri()) {
          try {
            const base64 = await readFileBase64(path);
            src = `data:${rasterImageMime(path)};base64,${base64}`;
          } catch {
            addNotification('error', 'Could not read the image file.');
            return;
          }
        } else {
          addNotification('info', 'Open an image file to preview it.');
          return;
        }
        setImageTarget({ name: basePathName(path), src });
      },
    });
    r.register({
      id: 'media-open',
      title: 'Media: Open Player',
      keywords: ['media', 'audio', 'video', 'play', 'sound'],
      run: async () => {
        const path = hasWorkspace ? ws.activePath : openFile;
        const kind = path ? mediaKind(path) : null;
        if (!path || !kind || !isMediaPath(path)) {
          addNotification('info', 'Open an audio or video file to play it.');
          return;
        }
        const content = hasWorkspace
          ? ws.activeDoc?.draft ?? ''
          : editedContents[openFile] ?? demoContentFor(openFile);
        // Media is binary. The browser demo stores a data URL; natively we read the
        // file's bytes as base64 (fs_read_file_base64) and wrap them in a data URL the
        // CSP's media-src allows.
        let src: string;
        if (content.startsWith('data:')) {
          src = content;
        } else if (isTauri()) {
          try {
            const base64 = await readFileBase64(path);
            src = `data:${mediaMime(path)};base64,${base64}`;
          } catch {
            addNotification('error', 'Could not read the media file.');
            return;
          }
        } else {
          addNotification('info', 'Open an audio or video file to play it.');
          return;
        }
        setMediaTarget({ name: basePathName(path), src, kind });
      },
    });
    r.register({
      id: 'view-hex',
      title: 'View: Hex',
      keywords: ['hex', 'binary', 'bytes', 'dump'],
      run: async () => {
        const path = hasWorkspace ? ws.activePath : openFile;
        if (!path) {
          addNotification('info', 'Open a file to view it as hex.');
          return;
        }
        // Natively, dump the file's true on-disk bytes (so binary and non-ASCII files
        // are exact; unsaved edits are not reflected); in the demo, encode the
        // in-memory content as UTF-8.
        let bytes: Uint8Array;
        if (hasWorkspace) {
          try {
            bytes = base64ToBytes(await readFileBase64(path));
          } catch {
            addNotification('error', 'Could not read the file.');
            return;
          }
        } else {
          bytes = new TextEncoder().encode(editedContents[openFile] ?? demoContentFor(openFile));
        }
        setHexTarget({ name: basePathName(path), bytes });
      },
    });
    r.register({
      id: 'open-settings',
      title: 'Preferences: Open Settings',
      keywords: ['settings', 'preferences', 'config', 'options'],
      keybinding: 'Ctrl+,',
      run: () => setSettingsOpen(true),
    });
    r.register({
      id: 'open-keyboard-shortcuts',
      title: 'Preferences: Keyboard Shortcuts',
      keywords: ['keybindings', 'shortcuts', 'keys', 'reference'],
      run: () => setShortcutsOpen(true),
    });
    r.register({
      id: 'terminal-new',
      title: 'Terminal: New Terminal',
      keywords: ['terminal', 'shell', 'console', 'new'],
      run: requestNewTerminal,
    });
    r.register({
      id: 'help-release-notes',
      title: 'Help: Release Notes',
      keywords: ['release', 'notes', 'changelog', 'whats', 'new', 'about'],
      run: () => setReleaseOpen(true),
    });
    r.register({
      id: 'settings-open-json',
      title: 'Settings: Open JSON',
      keywords: ['settings', 'json', 'edit', 'export', 'import', 'preferences'],
      run: () => setSettingsJsonOpen(true),
    });
    r.register({
      id: 'theme-export',
      title: 'Theme: Export',
      keywords: ['theme', 'export', 'copy', 'json', 'color', 'appearance'],
      run: () => setThemeExportOpen(true),
    });
    r.register({
      id: 'theme-import',
      title: 'Theme: Import',
      keywords: ['theme', 'import', 'paste', 'json', 'color', 'appearance', 'custom'],
      run: () => setThemeImportOpen(true),
    });
    r.register({
      id: 'developer-process-info',
      title: 'Developer: Process Info',
      keywords: ['process', 'info', 'memory', 'heap', 'performance', 'diagnostics', 'developer'],
      run: () => setProcessInfoOpen(true),
    });
    r.register({
      id: 'snippets-insert',
      title: 'Snippets: Insert Snippet',
      keywords: ['snippet', 'insert', 'template', 'boilerplate'],
      run: () => setSnippetsOpen(true),
    });
    r.register({
      id: 'help-accessibility',
      title: 'Help: Accessibility Help',
      keywords: ['accessibility', 'a11y', 'help', 'keyboard', 'screen', 'reader'],
      run: () => setA11yHelpOpen(true),
    });
    r.register({
      id: 'show-notifications',
      title: 'Notifications: Show',
      keywords: ['notifications', 'alerts', 'messages', 'center', 'bell'],
      run: () => setNotificationsOpen(true),
    });
    const editActions: ReadonlyArray<{ id: string; title: string; action: string; keywords: string[] }> = [
      { id: 'edit-undo', title: 'Edit: Undo', action: 'undo', keywords: ['undo', 'revert'] },
      { id: 'edit-redo', title: 'Edit: Redo', action: 'redo', keywords: ['redo'] },
      { id: 'edit-cut', title: 'Edit: Cut', action: 'editor.action.clipboardCutAction', keywords: ['cut'] },
      { id: 'edit-copy', title: 'Edit: Copy', action: 'editor.action.clipboardCopyAction', keywords: ['copy'] },
      { id: 'edit-paste', title: 'Edit: Paste', action: 'editor.action.clipboardPasteAction', keywords: ['paste'] },
      { id: 'edit-find', title: 'Edit: Find', action: 'actions.find', keywords: ['find', 'search'] },
      {
        id: 'edit-replace',
        title: 'Edit: Replace',
        action: 'editor.action.startFindReplaceAction',
        keywords: ['replace', 'find'],
      },
    ];
    for (const e of editActions) {
      r.register({
        id: e.id,
        title: e.title,
        keywords: e.keywords,
        run: () => {
          runEditorAction(e.action);
        },
      });
    }
    r.register({
      id: 'help-welcome',
      title: 'Help: Welcome',
      keywords: ['welcome', 'getting', 'started', 'help', 'intro'],
      run: () => setWelcomeOpen(true),
    });
    r.register({
      id: 'view-output',
      title: 'View: Output',
      keywords: ['output', 'log', 'console', 'channel'],
      keybinding: 'Ctrl+Shift+U',
      run: () => setBottomPanel((p) => (p === 'output' ? 'none' : 'output')),
    });
    r.register({
      id: 'view-outline',
      title: 'View: Outline',
      keywords: ['outline', 'symbols', 'headings', 'structure'],
      run: () => setBottomPanel((p) => (p === 'outline' ? 'none' : 'outline')),
    });
    // Change Language Mode: one command per language plus an entry that opens the
    // palette filtered to them, reached by clicking the language item in the status bar.
    r.register({
      id: 'change-language',
      title: 'Change Language Mode',
      keywords: ['language', 'mode', 'syntax', 'grammar'],
      run: () => openPalette('commands', 'Language Mode:'),
    });
    for (const lang of SELECTABLE_LANGUAGES) {
      r.register({
        id: `language-mode-${lang.id}`,
        title: `Language Mode: ${lang.label}`,
        keywords: ['language', 'mode', 'syntax', lang.label],
        run: () => {
          if (!setEditorLanguage(lang.id)) addNotification('info', 'Open a file to set its language.');
        },
      });
    }
    // Change End of Line: a picker plus a command per sequence, reached by clicking
    // the EOL item in the status bar.
    r.register({
      id: 'change-eol',
      title: 'Change End of Line Sequence',
      keywords: ['eol', 'end of line', 'line ending', 'lf', 'crlf', 'newline'],
      run: () => openPalette('commands', 'End of Line:'),
    });
    for (const eol of ['LF', 'CRLF'] as const) {
      r.register({
        id: `eol-${eol.toLowerCase()}`,
        title: `End of Line: ${eol}`,
        keywords: ['eol', 'end of line', 'line ending', eol],
        run: () => {
          if (!setEditorEol(eol)) addNotification('info', 'Open a file to change its line endings.');
        },
      });
    }
    // Indentation: clicking the status-bar indent item opens the conversion actions.
    r.register({
      id: 'change-indentation',
      title: 'Change Indentation',
      keywords: ['indent', 'indentation', 'spaces', 'tabs'],
      run: () => openPalette('commands', 'Convert Indentation'),
    });
    r.register({
      id: 'view-narration-log',
      title: 'View: Narration Log',
      keywords: ['narration', 'log', 'accessibility', 'captions', 'history', 'screen', 'reader'],
      run: () => setBottomPanel((p) => (p === 'narration' ? 'none' : 'narration')),
    });
    r.register({
      id: 'view-reset-layout',
      title: 'View: Reset Layout',
      keywords: ['reset', 'layout', 'default', 'restore', 'view'],
      run: () => {
        setBottomPanel('none');
        setZenMode(false);
        setSidebarHidden(false);
        setSidebarWidth(SIDEBAR_DEFAULT);
        setBottomHeight(BOTTOM_DEFAULT);
        setSettings((s) => ({ ...s, presentationMode: DEFAULT_SETTINGS.presentationMode }));
      },
    });
    r.register({
      id: 'toggle-zen',
      title: 'View: Toggle Zen Mode',
      keywords: ['zen', 'distraction', 'focus', 'hide'],
      run: () => setZenMode((z) => !z),
    });
    r.register({
      id: 'toggle-editor-readonly',
      title: 'View: Toggle Editor Read-only',
      keywords: ['read-only', 'readonly', 'lock', 'editable'],
      run: () => setEditorReadOnly((r) => !r),
    });
    r.register({
      id: 'toggle-maximized-panel',
      title: 'View: Toggle Maximized Panel',
      keywords: ['maximize', 'panel', 'bottom', 'terminal', 'expand'],
      run: () => setBottomMaximized((m) => !m),
    });
    r.register({
      id: 'toggle-fullscreen',
      title: 'View: Toggle Full Screen',
      keywords: ['fullscreen', 'full screen', 'f11', 'maximize'],
      run: () => {
        if (document.fullscreenElement) {
          void document.exitFullscreen().catch(() => {});
        } else {
          void document.documentElement.requestFullscreen().catch(() => {});
        }
      },
    });
    r.register({
      id: 'toggle-sidebar',
      title: 'View: Toggle Primary Sidebar',
      keywords: ['sidebar', 'explorer', 'hide', 'show', 'panel', 'left'],
      keybinding: 'Ctrl+B',
      run: () => setSidebarHidden((h) => !h),
    });
    r.register({
      id: 'nav-back',
      title: 'Go Back',
      keywords: ['back', 'navigate', 'history', 'previous', 'return'],
      keybinding: 'Alt+Left',
      run: () => {
        const cur = currentPosition();
        if (!cur) return;
        const previous = navBack(cur);
        if (previous) gotoLine(previous.line, previous.column, false);
      },
    });
    r.register({
      id: 'nav-forward',
      title: 'Go Forward',
      keywords: ['forward', 'navigate', 'history', 'next'],
      keybinding: 'Alt+Right',
      run: () => {
        const cur = currentPosition();
        if (!cur) return;
        const next = navForward(cur);
        if (next) gotoLine(next.line, next.column, false);
      },
    });
    r.register({
      id: 'toggle-panel',
      title: 'View: Toggle Panel',
      keywords: ['panel', 'bottom', 'problems', 'output', 'hide', 'show'],
      keybinding: 'Ctrl+J',
      run: () =>
        setBottomPanel((p) => {
          if (p !== 'none') {
            lastBottomPanelRef.current = p;
            return 'none';
          }
          return lastBottomPanelRef.current;
        }),
    });
    // Detected npm scripts, each runnable in a new terminal.
    const runTask = (task: NpmTask) => {
      const repo = hasWorkspace ? ws.roots[0]?.path ?? '' : '';
      const file = hasWorkspace ? ws.activePath ?? '' : openFile;
      // Run the task's dependency chain before it, in order, as one sequential command.
      const chain = resolveTaskChain(npmTasks, task.label);
      const toRun = chain.length > 0 ? chain : [task];
      const command = toRun
        .map((t) =>
          substituteVariables(t.command, {
            workspaceFolder: repo,
            file,
            fileBasename: file ? basePathName(file) : '',
          }),
        )
        .join(' && ');
      appendLog(`Running task: ${command}`, 'info', 'Tasks');
      requestRunInTerminal(command, task.label);
    };
    r.register({
      id: 'tasks-run-build',
      title: 'Tasks: Run Build Task',
      keywords: ['task', 'run', 'build', 'compile'],
      keybinding: 'Ctrl+Shift+B',
      run: () => {
        const build = npmTasks.find((t) => t.group === 'build');
        if (build) runTask(build);
        else addNotification('info', 'No build task found in this folder.');
      },
    });
    for (const task of npmTasks) {
      r.register({
        id: `task-${task.id}`,
        title: `Run Task: ${task.label}`,
        keywords: ['task', 'run', 'npm', 'script', task.label],
        run: () => runTask(task),
      });
    }
    // The editor command surface: Monaco's built-in editing actions, run on the
    // active editor through the bridge, so they are discoverable in the palette.
    for (const cmd of EDITOR_COMMANDS) {
      r.register({
        id: cmd.id,
        title: cmd.title,
        keywords: cmd.keywords,
        keybinding: cmd.keybinding,
        run: () => {
          runEditorAction(cmd.actionId);
        },
      });
    }
    r.register({
      id: 'run-agent',
      title: liveAvailable
        ? 'Run a real agent session'
        : 'Run a real agent session (needs the claude CLI)',
      keywords: ['agent', 'claude', 'session', 'live', 'run'],
      run: () => {
        const prompt = window.prompt(
          'What should the agent do?',
          'Add a validated login form with tests.',
        );
        if (prompt) void liveStart(prompt);
      },
    });
    r.register({
      id: 'review-changes',
      title: 'Review changes and commit',
      keywords: ['git', 'diff', 'commit', 'review', 'accept'],
      run: () => {
        // In the native app, reviewing changes needs a real repo; the browser demo
        // shows a showcase diff without one.
        if (isTauri() && !hasWorkspace) {
          addNotification('info', 'Open a folder to review changes.');
          return;
        }
        setReviewOpen(true);
      },
    });
    r.register({
      id: 'git-tags',
      title: 'Git: Tags',
      keywords: ['git', 'tags', 'tag', 'release', 'version'],
      run: () => setTagsOpen(true),
    });
    r.register({
      id: 'git-remotes',
      title: 'Git: Remotes',
      keywords: ['git', 'remote', 'remotes', 'origin', 'upstream', 'url'],
      run: () => setRemotesOpen(true),
    });
    r.register({
      id: 'git-stashes',
      title: 'Git: Stashes',
      keywords: ['git', 'stash', 'stashes', 'shelve', 'wip'],
      run: () => setStashesOpen(true),
    });
    r.register({
      id: 'git-history',
      title: 'Git: View History',
      keywords: ['git', 'history', 'log', 'commits'],
      run: () => {
        const repo = hasWorkspace ? ws.roots[0]?.path ?? null : null;
        if (!repo) {
          addNotification('info', 'Open a folder to view its git history.');
          return;
        }
        void gitLog(repo)
          .then((commits) => setGitHistory(commits))
          .catch((err) => appendLog(`Git history failed: ${String(err)}`));
      },
    });
    if (!hasWorkspace) {
      r.register({
        id: 'new-untitled',
        title: 'New Untitled File',
        keywords: ['new', 'untitled', 'scratchpad', 'file'],
        run: () => {
          untitledCounter.current += 1;
          const path = untitledName(untitledCounter.current);
          setEditedContents((m) => ({ ...m, [path]: '' }));
          setOpenFile(path);
          setSettings((s) =>
            s.presentationMode === 'companion' || s.presentationMode === 'cozy'
              ? s
              : { ...s, presentationMode: 'companion' },
          );
        },
      });
    }
    if (ws.available) {
      r.register({
        id: 'open-folder',
        title: 'Open Folder',
        keywords: ['workspace', 'project', 'directory', 'open'],
        run: () => void ws.openFolder(),
      });
    }
    // Save All and New File are always registered (the menu always lists them), but
    // guard the no-workspace case with a hint instead of silently doing nothing.
    r.register({
      id: 'save-all',
      title: 'Save All',
      keywords: ['write', 'disk', 'save'],
      run: () => {
        if (!hasWorkspace) {
          addNotification('info', 'Open a folder to save files to disk.');
          return;
        }
        void ws.saveAll();
      },
    });
    r.register({
      id: 'new-file',
      title: 'New File',
      keywords: ['create', 'file'],
      run: () => {
        const root = ws.roots[0];
        if (!root) {
          addNotification('info', 'Open a folder first, or use New Untitled File.');
          return;
        }
        const name = window.prompt('New file name', 'untitled.ts');
        if (name) void ws.newFile(root.path, name);
      },
    });
    if (hasWorkspace) {
      for (const root of ws.roots) {
        r.register({
          id: `close-folder-${root.id}`,
          title: `Close Folder: ${root.name}`,
          keywords: ['workspace', 'close'],
          run: () => ws.closeRoot(root.id),
        });
      }
    }
    for (const recent of ws.recents) {
      r.register({
        id: `recent-${recent.path}`,
        title: `Open Recent: ${recent.name}`,
        keywords: ['workspace', 'project', 'recent', recent.path],
        run: () => void ws.openPath(recent.path),
      });
    }
    const modes: PresentationMode[] = ['companion', 'stage', 'swarm', 'minimal', 'cozy'];
    for (const mode of modes) {
      r.register({
        id: `mode-${mode}`,
        title: `Switch to ${mode} mode`,
        keywords: ['view', 'layout', mode],
        run: () => setSettings((s) => ({ ...s, presentationMode: mode })),
      });
    }
    for (const id of bundledThemeIds()) {
      r.register({
        id: `theme-${id}`,
        title: `Theme: ${id}`,
        keywords: ['color', 'appearance'],
        run: () => setSettings((s) => ({ ...s, themeId: id })),
      });
    }
    r.register({
      id: 'reduced-motion',
      title: 'Toggle reduced motion',
      keywords: ['accessibility', 'a11y'],
      run: () => setSettings((s) => ({ ...s, reducedMotion: !s.reducedMotion })),
    });
    r.register({
      id: 'sound',
      title: 'Toggle sound',
      keywords: ['audio'],
      run: () => setSettings((s) => ({ ...s, sound: { ...s.sound, enabled: !s.sound.enabled } })),
    });
    return r;
  }, [
    playing,
    setPlaying,
    restart,
    liveAvailable,
    liveStart,
    hasWorkspace,
    ws,
    compareWithSaved,
    selectForCompare,
    compareWithSelected,
    npmTasks,
    openFile,
    editedContents,
  ]);

  // Keep the key-handler's registry ref current so Ctrl/Cmd+Shift+B reaches the
  // latest Tasks: Run Build Task closure (which depends on npmTasks).
  useEffect(() => {
    registryRef.current = registry;
  }, [registry]);

  const mode = settings.presentationMode;
  const isEditorMode = mode === 'companion' || mode === 'cozy';
  // Width of the primary sidebar (companion mode), draggable via a sash and persisted.
  const [sidebarWidth, setSidebarWidth] = useState<number>(() =>
    loadSidebarWidth(localStorage.getItem('vsclaude.sidebarWidth')),
  );
  useEffect(() => {
    localStorage.setItem('vsclaude.sidebarWidth', String(sidebarWidth));
  }, [sidebarWidth]);
  // Height of the bottom panel dock, draggable via a horizontal sash and persisted.
  const [bottomHeight, setBottomHeight] = useState<number>(() =>
    loadBottomHeight(localStorage.getItem('vsclaude.bottomHeight')),
  );
  useEffect(() => {
    localStorage.setItem('vsclaude.bottomHeight', String(bottomHeight));
  }, [bottomHeight]);
  // Persist the browser demo's active file so a reload reopens it (see lib/active-file.ts).
  useEffect(() => {
    localStorage.setItem('vsclaude.activeFile', openFile);
  }, [openFile]);
  // Persist the primary sidebar visibility and the open bottom panel across a reload.
  useEffect(() => {
    localStorage.setItem('vsclaude.sidebarHidden', String(sidebarHidden));
  }, [sidebarHidden]);
  useEffect(() => {
    localStorage.setItem('vsclaude.bottomPanel', bottomPanel);
  }, [bottomPanel]);
  const stateLabel = STATE_LABELS[session.directive.state] ?? session.directive.state;
  const currentPath = session.current?.payload?.['path'];
  const activePath = typeof currentPath === 'string' ? currentPath : undefined;

  // Follow the agent: when it touches a file, open that file in the editor. With
  // a real workspace open this only follows a live session (whose paths exist on
  // disk); the scripted demo drives the soul, not the real editor.
  useEffect(() => {
    if (!isEditorMode || !activePath) return;
    if (hasWorkspace) {
      if (usingLive) void ws.openFile(activePath);
    } else {
      setOpenFile(activePath);
    }
  }, [activePath, isEditorMode, hasWorkspace, usingLive, ws]);

  // The explorer shows in companion mode, and also whenever a real workspace is
  // open in any editor mode so files are always reachable.
  const showExplorer = mode === 'companion' || (hasWorkspace && isEditorMode);
  const showTimeline = mode !== 'minimal';
  const showBottom = mode !== 'minimal';
  const content = editedContents[openFile] ?? demoContentFor(openFile);
  // Git merge conflicts in the active (demo) file, for the conflict bar.
  const conflicts = useMemo<Conflict[]>(() => findConflicts(content), [content]);
  const resolveActiveConflict = useCallback(
    (conflict: Conflict, choice: ConflictChoice) => {
      setEditedContents((m) => ({
        ...m,
        [openFile]: resolveConflict(m[openFile] ?? demoContentFor(openFile), conflict, choice),
      }));
    },
    [openFile],
  );
  // The active file's outline symbols, for inline `@` Go to Symbol in the palette.
  const editorSymbols = useMemo(() => outlineSymbols(openFile, content), [openFile, content]);
  // Flat path list backing the breadcrumb folder dropdowns: the demo file set, or
  // the loaded workspace tree flattened (the open file's ancestors are loaded).
  const breadcrumbEntries = useMemo<{ path: string; kind: 'file' | 'directory' }[]>(() => {
    if (!hasWorkspace) return demoFiles;
    const flat: { path: string; kind: 'file' | 'directory' }[] = [];
    const walk = (nodes: readonly TreeNode[]) => {
      for (const node of nodes) {
        flat.push({ path: node.path, kind: node.isDirectory ? 'directory' : 'file' });
        if (node.children) walk(node.children);
      }
    };
    walk(ws.tree);
    return flat;
  }, [hasWorkspace, ws.tree]);

  const terminalLines = useMemo(() => {
    const lines: string[] = [];
    for (const e of session.events) {
      if (e.type === 'command_run') {
        const cmd = e.payload?.['command'];
        if (typeof cmd === 'string') lines.push(`\x1b[38;2;127;176;105m$\x1b[0m ${cmd}`);
      } else if (e.type === 'command_output') {
        const chunk = e.payload?.['chunk'];
        if (typeof chunk === 'string') lines.push(chunk);
      }
    }
    return lines;
  }, [session.events]);

  const pixie = (
    <PixieStage actionId={session.actionId} caption={session.directive.caption} stateLabel={stateLabel} />
  );

  return (
    <div
      className="app-shell"
      data-mode={mode}
      data-zen={zenMode}
      data-fullscreen={isFullscreen}
      data-sidebar-hidden={sidebarHidden}
      data-bottom-maximized={bottomMaximized}
      style={
        {
          zoom: settings.uiScale,
          ['--sidebar-width']: `${sidebarWidth}px`,
          ['--bottom-height']: `${bottomHeight}px`,
        } as React.CSSProperties
      }
    >
      <PixieActionSprite />

      <header className="app-header">
        <div className="app-brand">
          <span className="app-brand__glyph" aria-hidden>
            {'>_'}
          </span>
          <span className="app-brand__name">vsclaude</span>
          <span className="app-brand__tag">Claude Code, in motion</span>
        </div>
        <MenuBar onRun={(id) => void registry.run(id)} />
        <SettingsBar
          settings={settings}
          onSettings={setSettings}
          playing={playing}
          setPlaying={setPlaying}
          restart={restart}
          index={session.index}
          total={session.total}
        />
      </header>

      <div className="app-body">
        <ActivityBar
          activeView={activeViewFor(bottomPanel)}
          problemsCount={diagnosticCounts.error + diagnosticCounts.warning}
          changesCount={gitSummary?.changes ?? 0}
          onExplorer={() => setSettings((s) => ({ ...s, presentationMode: 'companion' }))}
          onSearch={() => setBottomPanel((p) => (p === 'search' ? 'none' : 'search'))}
          onSourceControl={() => setBottomPanel((p) => (p === 'scm' ? 'none' : 'scm'))}
          onProblems={() => setBottomPanel((p) => (p === 'problems' ? 'none' : 'problems'))}
          onSettings={() => setSettingsOpen(true)}
          onShortcuts={() => setShortcutsOpen(true)}
        />
        <main className="app-main">
        {showExplorer && !sidebarHidden ? (
          hasWorkspace ? (
            <WorkspaceExplorer ws={ws} />
          ) : (
            <ExplorerPanel
              files={demoFiles}
              activePath={activePath}
              openPath={openFile}
              problems={fileProblems}
              openEditors={openFile ? [{ path: openFile, name: basePathName(openFile) }] : []}
              onSelect={setOpenFile}
            />
          )
        ) : null}

        {mode === 'companion' && !sidebarHidden ? (
          <Sash
            orientation="vertical"
            value={sidebarWidth}
            min={SIDEBAR_MIN}
            max={SIDEBAR_MAX}
            onChange={setSidebarWidth}
            ariaLabel="Resize sidebar"
            className="sash--sidebar"
          />
        ) : null}

        <div className="app-center">
          {mode === 'swarm' ? (
            <SwarmPanel
              roster={session.roster}
              edges={session.edges}
              actionByAgent={session.actionByAgent}
              tokens={session.tokens}
            />
          ) : isEditorMode ? (
            <div className="editor-wrap">
              {(hasWorkspace ? ws.activePath : openFile) ? (
                <Breadcrumbs
                  path={(hasWorkspace ? ws.activePath : openFile) as string}
                  root={hasWorkspace ? ws.roots[0]?.path : undefined}
                  entries={breadcrumbEntries}
                  onOpen={openFileFromPalette}
                  onSymbols={() => runEditorAction('editor.action.quickOutline')}
                />
              ) : null}
              {hasWorkspace ? (
                <WorkspaceEditor ws={ws} />
              ) : (
                <>
                  <MergeConflictBar conflicts={conflicts} onResolve={resolveActiveConflict} />
                  <EditorPanel
                  path={openFile}
                  value={content}
                  language={
                    languageForPath(openFile) === 'plaintext'
                      ? detectLanguageFromContent(content) ?? undefined
                      : undefined
                  }
                  revealLine={revealTarget?.path === openFile ? revealTarget.line : undefined}
                  onRevealed={clearRevealTarget}
                  onChange={(v) => setEditedContents((m) => ({ ...m, [openFile]: v }))}
                  onSave={(v) => setEditedContents((m) => ({ ...m, [openFile]: v }))}
                  readOnly={editorReadOnly}
                  />
                </>
              )}
            </div>
          ) : (
            pixie
          )}
        </div>

        {isEditorMode ? (
          <div className="app-right">
            <section className="pixie-companion">
              <PixieStage
                actionId={session.actionId}
                caption={session.directive.caption}
                stateLabel={stateLabel}
                size={92}
              />
            </section>
            <TimelinePanel timeline={session.timeline} />
          </div>
        ) : showTimeline ? (
          <TimelinePanel timeline={session.timeline} />
        ) : null}
        </main>
      </div>

      {showBottom ? (
        <footer className="app-bottom">
          <Sash
            orientation="horizontal"
            value={bottomHeight}
            min={BOTTOM_MIN}
            max={BOTTOM_MAX}
            onChange={setBottomHeight}
            ariaLabel="Resize panel"
            className="sash--bottom"
          />
          <TerminalTabs fallbackLines={terminalLines} cwd={hasWorkspace ? ws.roots[0]?.path : undefined} />
          <TokenPanel tokens={session.tokens} tree={session.tree} />
          <Narration narration={session.narration} />
        </footer>
      ) : (
        <footer className="app-bottom app-bottom--minimal">
          <Narration narration={session.narration} />
        </footer>
      )}

      {bottomPanel === 'problems' ? (
        <ProblemsPanel
          diagnostics={diagnostics}
          onOpen={openProblem}
          onClose={() => setBottomPanel('none')}
        />
      ) : bottomPanel === 'search' ? (
        <SearchPanel
          root={hasWorkspace ? ws.roots[0]?.path ?? null : null}
          onOpen={openProblem}
          onClose={() => setBottomPanel('none')}
        />
      ) : bottomPanel === 'scm' ? (
        <SourceControlPanel
          repo={hasWorkspace ? ws.roots[0]?.path ?? null : null}
          onDiff={(change) => void openScmDiff(change)}
          onClose={() => setBottomPanel('none')}
          onChanged={() => setGitNonce((n) => n + 1)}
        />
      ) : bottomPanel === 'output' ? (
        <OutputPanel onClose={() => setBottomPanel('none')} />
      ) : bottomPanel === 'outline' ? (
        <OutlinePanel
          path={hasWorkspace ? ws.activePath : openFile}
          content={
            hasWorkspace ? ws.activeDoc?.draft ?? '' : editedContents[openFile] ?? demoContentFor(openFile)
          }
          activeLine={editorStatus?.line ?? null}
          onReveal={(line) => gotoLine(line, 1)}
          onClose={() => setBottomPanel('none')}
        />
      ) : bottomPanel === 'narration' ? (
        <NarrationLog narration={session.narration} onClose={() => setBottomPanel('none')} />
      ) : null}

      <StatusBar items={statusItems} onCommand={(id) => void registry.run(id)} />

      {ws.error ? (
        <div className="workspace-toast" role="alert">
          <span>{ws.error}</span>
          <button type="button" className="workspace-toast__close" aria-label="Dismiss" onClick={ws.clearError}>
            {'×'}
          </button>
        </div>
      ) : null}

      <CommandPalette
        registry={registry}
        files={paletteFiles}
        onOpenFile={openFileFromPalette}
        onGotoLine={(line, column) => gotoLine(line, column)}
        onGotoSymbol={() => runEditorAction('editor.action.quickOutline')}
        editorSymbols={editorSymbols}
        workspaceSymbols={workspaceSymbolIndex}
        onOpenSymbol={openSymbol}
        onRefreshFiles={hasWorkspace ? fileIndex.refresh : undefined}
      />
      {settingsOpen ? (
        <SettingsPanel settings={settings} onChange={setSettings} onClose={() => setSettingsOpen(false)} />
      ) : null}
      {shortcutsOpen ? (
        <KeyboardShortcuts registry={registry} onClose={() => setShortcutsOpen(false)} />
      ) : null}
      {welcomeOpen ? (
        <WelcomePanel
          actions={welcomeActions}
          onAction={onWelcomeAction}
          recents={ws.recents.map((r) => ({ name: r.name, path: r.path }))}
          onOpenRecent={(path) => {
            setWelcomeOpen(false);
            void ws.openPath(path);
          }}
          onClose={() => setWelcomeOpen(false)}
        />
      ) : null}
      <DiffModal target={diffTarget} onClose={() => setDiffTarget(null)} />
      <MarkdownPreview target={markdownTarget} onClose={() => setMarkdownTarget(null)} />
      <ImagePreview target={imageTarget} onClose={() => setImageTarget(null)} />
      <MediaPlayer target={mediaTarget} onClose={() => setMediaTarget(null)} />
      <HexView target={hexTarget} onClose={() => setHexTarget(null)} />
      <ProcessInfoModal open={processInfoOpen} onClose={() => setProcessInfoOpen(false)} />
      <AccessibilityHelp open={a11yHelpOpen} onClose={() => setA11yHelpOpen(false)} />
      <SnippetsModal
        open={snippetsOpen}
        onInsert={(body) => {
          if (!insertSnippet(body)) addNotification('info', 'Open a file to insert a snippet.');
        }}
        onClose={() => setSnippetsOpen(false)}
      />
      <GitHistoryModal
        commits={gitHistory}
        repo={hasWorkspace ? ws.roots[0]?.path ?? null : null}
        onReverted={() => {
          const repo = hasWorkspace ? ws.roots[0]?.path ?? null : null;
          if (repo) void gitLog(repo).then((commits) => setGitHistory(commits));
        }}
        onClose={() => setGitHistory(null)}
      />
      <GitTagsModal
        open={tagsOpen}
        repo={hasWorkspace ? ws.roots[0]?.path ?? null : null}
        onClose={() => setTagsOpen(false)}
      />
      <GitRemotesModal
        open={remotesOpen}
        repo={hasWorkspace ? ws.roots[0]?.path ?? null : null}
        onClose={() => setRemotesOpen(false)}
      />
      <GitStashModal
        open={stashesOpen}
        repo={hasWorkspace ? ws.roots[0]?.path ?? null : null}
        onClose={() => setStashesOpen(false)}
        onChanged={() => setGitNonce((n) => n + 1)}
      />
      <ReleaseNotes open={releaseOpen} onClose={() => setReleaseOpen(false)} />
      <NotificationCenter open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <NotificationToast />
      <SettingsJsonModal
        open={settingsJsonOpen}
        settings={settings}
        onApply={(next) => setSettings(next)}
        onClose={() => setSettingsJsonOpen(false)}
      />
      <ThemeExportModal open={themeExportOpen} settings={settings} onClose={() => setThemeExportOpen(false)} />
      <ThemeImportModal
        open={themeImportOpen}
        onApply={(theme) => setSettings((s) => ({ ...s, themeId: 'custom', customTheme: theme }))}
        onClose={() => setThemeImportOpen(false)}
      />
      <DiffReview
        open={reviewOpen}
        cwd={hasWorkspace ? ws.roots[0]?.path ?? '.' : '.'}
        onClose={() => setReviewOpen(false)}
      />
    </div>
  );
}
