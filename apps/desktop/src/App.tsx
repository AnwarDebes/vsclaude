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
import { basePathName, joinPath } from '@vsclaude/editor';
import { bundledThemeIds } from '@vsclaude/design-system';
import { languageForPath } from './lib/language';
import { readFile } from './workspace/fsClient';
import { gitHeadFile } from './lib/tauri';
import { useSession } from './session/useSession';
import { useLiveProvider } from './session/useLiveProvider';
import { useWorkspace } from './workspace/useWorkspace';
import { useFileIndex } from './workspace/useFileIndex';
import { gotoLine, runEditorAction } from './lib/editor-bridge';
import { setEditorSettings } from './lib/editor-settings';
import { applyMonacoTheme } from './lib/monaco-theme';
import { EDITOR_COMMANDS } from './lib/editor-commands';
import { useDiagnostics } from './lib/useDiagnostics';
import { demoFiles } from './session/demo-session';
import { demoContentFor } from './session/demo-files';
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
import { appendLog } from './lib/output-log';
import { SearchPanel } from './components/SearchPanel';
import { SourceControlPanel } from './components/SourceControlPanel';
import { GitHistoryModal } from './components/GitHistoryModal';
import { GitTagsModal } from './components/GitTagsModal';
import { gitLog, type GitCommit } from './lib/tauri';
import { SettingsPanel } from './components/SettingsPanel';
import { SettingsJsonModal } from './components/SettingsJsonModal';
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
import { isSvgPath, svgDataUrl } from './lib/preview';
import { HexView, type HexTarget } from './components/HexView';
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
import { detectNpmTasks, parseTasksJson, type NpmTask } from './lib/tasks';
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

const LANGUAGE_LABELS: Record<string, string> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  json: 'JSON',
  css: 'CSS',
  html: 'HTML',
  markdown: 'Markdown',
  rust: 'Rust',
  plaintext: 'Plain Text',
};

/** A friendly display name for a Monaco language id. */
function languageLabel(id: string): string {
  return LANGUAGE_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

/**
 * The vsclaude shell: a cozy, multi-panel IDE driven end to end by the real
 * packages. The motion mapper drives Pixie, the agent runtime builds the swarm
 * tree, the chat builder drives the timeline, and the design system themes it.
 * Presentation modes rearrange the room; the command palette runs everything.
 */
export function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings());
  const [openFile, setOpenFile] = useState('src/auth/login-form.tsx');
  const [editedContents, setEditedContents] = useState<Record<string, string>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [bottomPanel, setBottomPanel] = useState<
    'none' | 'problems' | 'search' | 'scm' | 'output' | 'outline'
  >('none');
  const [gitNonce, setGitNonce] = useState(0);
  const [diffTarget, setDiffTarget] = useState<DiffTarget | null>(null);
  const [markdownTarget, setMarkdownTarget] = useState<MarkdownTarget | null>(null);
  const [imageTarget, setImageTarget] = useState<ImageTarget | null>(null);
  const [hexTarget, setHexTarget] = useState<HexTarget | null>(null);
  const [gitHistory, setGitHistory] = useState<GitCommit[] | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [npmTasks, setNpmTasks] = useState<NpmTask[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsJsonOpen, setSettingsJsonOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [zenMode, setZenMode] = useState(false);
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
        ariaLabel: editorStatus.indent.insertSpaces
          ? `Indentation, ${editorStatus.indent.tabSize} spaces`
          : `Indentation, tab size ${editorStatus.indent.tabSize}`,
      });
      items.push({
        id: 'editor.eol',
        side: 'right',
        priority: 30,
        text: editorStatus.eol,
        ariaLabel: `End of line ${editorStatus.eol}`,
      });
      items.push({
        id: 'editor.language',
        side: 'right',
        priority: 20,
        text: languageLabel(editorStatus.language),
        ariaLabel: `Language ${languageLabel(editorStatus.language)}`,
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
    const apply = () => setSettings((s) => ({ ...s, themeId: themeForSystem(media.matches) }));
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [settings.followSystemTheme]);

  // Notable events flow to the Output channel.
  useEffect(() => {
    appendLog('vsclaude ready.');
  }, []);
  useEffect(() => {
    if (ws.error) {
      appendLog(`Error: ${ws.error}`, 'error');
      addNotification('error', ws.error);
    }
  }, [ws.error]);

  // The bottom drawer shortcuts, matching VS Code: Ctrl or Cmd plus Shift plus M
  // for Problems and plus Shift plus F for Search. One slot, so each toggles.
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
      keywords: ['image', 'svg', 'preview', 'picture'],
      run: () => {
        const path = hasWorkspace ? ws.activePath : openFile;
        if (!path || !isSvgPath(path)) {
          addNotification('info', 'Open an SVG file to preview it.');
          return;
        }
        const svg = hasWorkspace
          ? ws.activeDoc?.draft ?? ''
          : editedContents[openFile] ?? demoContentFor(openFile);
        setImageTarget({ name: basePathName(path), src: svgDataUrl(svg) });
      },
    });
    r.register({
      id: 'view-hex',
      title: 'View: Hex',
      keywords: ['hex', 'binary', 'bytes', 'dump'],
      run: () => {
        const path = hasWorkspace ? ws.activePath : openFile;
        if (!path) {
          addNotification('info', 'Open a file to view it as hex.');
          return;
        }
        const content = hasWorkspace
          ? ws.activeDoc?.draft ?? ''
          : editedContents[openFile] ?? demoContentFor(openFile);
        setHexTarget({ name: basePathName(path), content });
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
    r.register({
      id: 'view-reset-layout',
      title: 'View: Reset Layout',
      keywords: ['reset', 'layout', 'default', 'restore', 'view'],
      run: () => {
        setBottomPanel('none');
        setZenMode(false);
        setSettings((s) => ({ ...s, presentationMode: DEFAULT_SETTINGS.presentationMode }));
      },
    });
    r.register({
      id: 'toggle-zen',
      title: 'View: Toggle Zen Mode',
      keywords: ['zen', 'distraction', 'focus', 'fullscreen', 'hide'],
      run: () => setZenMode((z) => !z),
    });
    // Detected npm scripts, each runnable in a new terminal.
    const runTask = (task: NpmTask) => {
      const repo = hasWorkspace ? ws.roots[0]?.path ?? '' : '';
      const file = hasWorkspace ? ws.activePath ?? '' : openFile;
      const command = substituteVariables(task.command, {
        workspaceFolder: repo,
        file,
        fileBasename: file ? basePathName(file) : '',
      });
      appendLog(`Running task: ${command}`);
      requestRunInTerminal(command, task.label);
    };
    r.register({
      id: 'tasks-run-build',
      title: 'Tasks: Run Build Task',
      keywords: ['task', 'run', 'build', 'compile'],
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
      run: () => setReviewOpen(true),
    });
    r.register({
      id: 'git-tags',
      title: 'Git: Tags',
      keywords: ['git', 'tags', 'tag', 'release', 'version'],
      run: () => setTagsOpen(true),
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
    if (hasWorkspace) {
      r.register({
        id: 'save-all',
        title: 'Save All',
        keywords: ['write', 'disk', 'save'],
        run: () => void ws.saveAll(),
      });
      r.register({
        id: 'new-file',
        title: 'New File',
        keywords: ['create', 'file'],
        run: () => {
          const root = ws.roots[0];
          if (!root) return;
          const name = window.prompt('New file name', 'untitled.ts');
          if (name) void ws.newFile(root.path, name);
        },
      });
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
    npmTasks,
    openFile,
    editedContents,
  ]);

  const mode = settings.presentationMode;
  const isEditorMode = mode === 'companion' || mode === 'cozy';
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
    <div className="app-shell" data-mode={mode} data-zen={zenMode} style={{ zoom: settings.uiScale }}>
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
        {showExplorer ? (
          hasWorkspace ? (
            <WorkspaceExplorer ws={ws} />
          ) : (
            <ExplorerPanel
              files={demoFiles}
              activePath={activePath}
              openPath={openFile}
              problems={fileProblems}
              onSelect={setOpenFile}
            />
          )
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
                  onSymbols={() => runEditorAction('editor.action.quickOutline')}
                />
              ) : null}
              {hasWorkspace ? (
                <WorkspaceEditor ws={ws} />
              ) : (
                <EditorPanel
                  path={openFile}
                  value={content}
                  onChange={(v) => setEditedContents((m) => ({ ...m, [openFile]: v }))}
                  onSave={(v) => setEditedContents((m) => ({ ...m, [openFile]: v }))}
                />
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
          <TerminalTabs fallbackLines={terminalLines} />
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
          onReveal={(line) => gotoLine(line, 1)}
          onClose={() => setBottomPanel('none')}
        />
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
      <HexView target={hexTarget} onClose={() => setHexTarget(null)} />
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
      <ReleaseNotes open={releaseOpen} onClose={() => setReleaseOpen(false)} />
      <NotificationCenter open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <NotificationToast />
      <SettingsJsonModal
        open={settingsJsonOpen}
        settings={settings}
        onApply={(next) => setSettings(next)}
        onClose={() => setSettingsJsonOpen(false)}
      />
      <DiffReview open={reviewOpen} cwd="." onClose={() => setReviewOpen(false)} />
    </div>
  );
}
