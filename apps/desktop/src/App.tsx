import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppSettings, PresentationMode } from '@vsclaude/contracts';
import { CommandRegistry, type QuickPickItem } from '@vsclaude/core-shell';
import { bundledThemeIds } from '@vsclaude/design-system';
import { useSession } from './session/useSession';
import { useLiveProvider } from './session/useLiveProvider';
import { useWorkspace } from './workspace/useWorkspace';
import { useFileIndex } from './workspace/useFileIndex';
import { gotoLine } from './lib/editor-bridge';
import { demoFiles } from './session/demo-session';
import { demoContentFor } from './session/demo-files';
import { applyTheme, loadAppSettings, saveAppSettings } from './lib/theme';
import { PixieStage } from './components/PixieStage';
import { PixieActionSprite } from './components/ActionIcon';
import { SettingsBar } from './components/SettingsBar';
import { CommandPalette, openPalette } from './components/CommandPalette';
import { DiffReview } from './components/DiffReview';
import { Narration } from './components/Narration';
import { ExplorerPanel } from './panels/ExplorerPanel';
import { EditorPanel } from './panels/EditorPanel';
import { WorkspaceExplorer } from './components/WorkspaceExplorer';
import { WorkspaceEditor } from './components/WorkspaceEditor';
import { SwarmPanel } from './panels/SwarmPanel';
import { TimelinePanel } from './panels/TimelinePanel';
import { TokenPanel } from './panels/TokenPanel';
import { TerminalPanel } from './panels/TerminalPanel';

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
export function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings());
  const [openFile, setOpenFile] = useState('src/auth/login-form.tsx');
  const [editedContents, setEditedContents] = useState<Record<string, string>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
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
        .filter((f) => f.kind === 'file')
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

  useEffect(() => {
    applyTheme(settings);
    saveAppSettings(settings);
  }, [settings]);

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
  }, [playing, setPlaying, restart, liveAvailable, liveStart, hasWorkspace, ws]);

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
    <div className="app-shell" data-mode={mode}>
      <PixieActionSprite />

      <header className="app-header">
        <div className="app-brand">
          <span className="app-brand__glyph" aria-hidden>
            {'>_'}
          </span>
          <span className="app-brand__name">vsclaude</span>
          <span className="app-brand__tag">Claude Code, in motion</span>
        </div>
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

      <main className="app-main">
        {showExplorer ? (
          hasWorkspace ? (
            <WorkspaceExplorer ws={ws} />
          ) : (
            <ExplorerPanel
              files={demoFiles}
              activePath={activePath}
              openPath={openFile}
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
            hasWorkspace ? (
              <WorkspaceEditor ws={ws} />
            ) : (
              <EditorPanel
                path={openFile}
                value={content}
                onChange={(v) => setEditedContents((m) => ({ ...m, [openFile]: v }))}
                onSave={(v) => setEditedContents((m) => ({ ...m, [openFile]: v }))}
              />
            )
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

      {showBottom ? (
        <footer className="app-bottom">
          <TerminalPanel fallbackLines={terminalLines} />
          <TokenPanel tokens={session.tokens} tree={session.tree} />
          <Narration narration={session.narration} />
        </footer>
      ) : (
        <footer className="app-bottom app-bottom--minimal">
          <Narration narration={session.narration} />
        </footer>
      )}

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
        onRefreshFiles={hasWorkspace ? fileIndex.refresh : undefined}
      />
      <DiffReview open={reviewOpen} cwd="." onClose={() => setReviewOpen(false)} />
    </div>
  );
}
