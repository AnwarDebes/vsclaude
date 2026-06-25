/**
 * The workspace: open root folders, a lazily loaded file tree backed by the Rust
 * core, open documents with dirty tracking and save-to-disk, full file
 * operations, and live external-change reconciliation through the filesystem
 * watcher. This hook is the single owner of real-file state; the explorer and
 * editor are projections of it. In a plain browser (no Tauri) it stays inert and
 * the app falls back to the demo experience.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FsEntry } from '@vsclaude/contracts';
import {
  addRecent,
  basePathName,
  buildWorkspaceTree,
  deriveDuplicatePath,
  joinPath,
  mergeDirEntries,
  normalizePath,
  parentDir,
  parseRecents,
  pruneSet,
  pruneSubtree,
  serializeRecents,
  validateMove,
  type RecentProject,
  type TreeNode,
} from '@vsclaude/editor';
import {
  copyPath,
  createDir,
  createFile,
  deletePath,
  isTauri,
  onFsChanged,
  pickFolder,
  readDir,
  readFile,
  renamePath,
  unwatchPath,
  watchPath,
  writeFile,
} from './fsClient';

const RECENTS_KEY = 'vsclaude.workspace.recents';
const ROOTS_KEY = 'vsclaude.workspace.roots';

export interface WorkspaceRoot {
  id: string;
  path: string;
  name: string;
  watchId?: string;
}

/** An open document: what is on disk, the current draft, and its sync state. */
export interface OpenDoc {
  path: string;
  disk: string;
  draft: string;
  mtimeMs: number;
  dirty: boolean;
  /** Whether the file changed or vanished on disk under us. */
  external: 'none' | 'changed' | 'deleted';
}

function loadRecents(): RecentProject[] {
  if (typeof localStorage === 'undefined') return [];
  return parseRecents(localStorage.getItem(RECENTS_KEY));
}

function persistRecents(list: RecentProject[]): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(RECENTS_KEY, serializeRecents(list));
  }
}

/** The workspace root paths persisted from the last session (read synchronously). */
export function loadRootPaths(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const data: unknown = JSON.parse(localStorage.getItem(ROOTS_KEY) ?? '[]');
    return Array.isArray(data) ? data.filter((p): p is string => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

function persistRootPaths(paths: string[]): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(ROOTS_KEY, JSON.stringify(paths));
  }
}

/**
 * Re-keys every open document at or under `from` to the new prefix `to`, after a
 * rename or move that relocated a whole subtree on disk. Returns a new map, or
 * null when nothing matched so the caller can skip the state update.
 */
function rekeySubtree(
  prev: ReadonlyMap<string, OpenDoc>,
  from: string,
  to: string,
): Map<string, OpenDoc> | null {
  let changed = false;
  const next = new Map<string, OpenDoc>();
  for (const [key, doc] of prev) {
    if (key === from || key.startsWith(`${from}/`)) {
      const nextKey = to + key.slice(from.length);
      next.set(nextKey, { ...doc, path: nextKey });
      changed = true;
    } else {
      next.set(key, doc);
    }
  }
  return changed ? next : null;
}

/** Remaps the active path across a subtree relocation from `from` to `to`. */
function remapActive(cur: string | null, from: string, to: string): string | null {
  if (cur && (cur === from || cur.startsWith(`${from}/`))) return to + cur.slice(from.length);
  return cur;
}

export interface WorkspaceApi {
  available: boolean;
  roots: WorkspaceRoot[];
  recents: RecentProject[];
  tree: TreeNode[];
  expanded: ReadonlySet<string>;
  docs: ReadonlyMap<string, OpenDoc>;
  activePath: string | null;
  activeDoc: OpenDoc | null;
  error: string | null;
  clearError: () => void;
  openFolder: () => Promise<void>;
  openPath: (path: string) => Promise<void>;
  closeRoot: (id: string) => void;
  toggleDir: (path: string) => void;
  openFile: (path: string) => Promise<void>;
  setActivePath: (path: string) => void;
  closeDoc: (path: string) => void;
  setDraft: (path: string, text: string) => void;
  save: (path: string) => Promise<void>;
  saveAll: () => Promise<void>;
  reload: (path: string) => Promise<void>;
  keepMine: (path: string) => void;
  newFile: (dir: string, name: string) => Promise<void>;
  newFolder: (dir: string, name: string) => Promise<void>;
  rename: (path: string, nextName: string) => Promise<void>;
  remove: (path: string) => Promise<void>;
  duplicate: (path: string) => Promise<void>;
  move: (from: string, toDir: string) => Promise<void>;
}

export function useWorkspace(): WorkspaceApi {
  const available = isTauri();
  const [roots, setRoots] = useState<WorkspaceRoot[]>([]);
  const [entries, setEntries] = useState<ReadonlyMap<string, FsEntry>>(new Map());
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [loadedDirs, setLoadedDirs] = useState<ReadonlySet<string>>(new Set());
  const [docs, setDocs] = useState<ReadonlyMap<string, OpenDoc>>(new Map());
  const [activePath, setActive] = useState<string | null>(null);
  const [recents, setRecents] = useState<RecentProject[]>(() => loadRecents());
  const [error, setError] = useState<string | null>(null);

  // Mirrors for the async watcher callback, which must read the latest state.
  const docsRef = useRef(docs);
  const loadedRef = useRef(loadedDirs);
  const rootsRef = useRef(roots);
  docsRef.current = docs;
  loadedRef.current = loadedDirs;
  rootsRef.current = roots;

  // Paths currently open or being opened, deduplicated outside of React state so
  // a double-invoked effect (StrictMode) or concurrent calls never add a root
  // twice. The stale `roots` closure cannot be trusted for this guard.
  const openingRef = useRef<Set<string>>(new Set());

  const fail = useCallback((e: unknown) => {
    setError(e instanceof Error ? e.message : String(e));
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const refreshDir = useCallback(
    async (dir: string, quiet = false) => {
      try {
        const children = await readDir(dir);
        setEntries((prev) => mergeDirEntries(prev, dir, children));
      } catch (e) {
        // Watcher-driven refreshes race with the very operation that fired them
        // (a path can vanish between the event and the read), so they stay quiet
        // rather than popping an error toast for a benign race.
        if (!quiet) fail(e);
      }
    },
    [fail],
  );

  const openPath = useCallback(
    async (rawPath: string) => {
      const path = normalizePath(rawPath);
      if (openingRef.current.has(path)) return;
      openingRef.current.add(path);
      try {
        const children = await readDir(path);
        const name = basePathName(path) || path;
        let watchId: string | undefined;
        try {
          watchId = (await watchPath(path)).watchId;
        } catch {
          watchId = undefined;
        }
        const rootEntry: FsEntry = { path, name, kind: 'directory' };
        setEntries((prev) => {
          const next = mergeDirEntries(prev, path, children);
          next.set(path, rootEntry);
          return next;
        });
        setLoadedDirs((prev) => new Set(prev).add(path));
        setExpanded((prev) => new Set(prev).add(path));
        setRoots((prev) => [...prev, { id: `root-${path}`, path, name, watchId }]);
        setRecents((prev) => {
          const next = addRecent(prev, { path, name }, Date.now());
          persistRecents(next);
          return next;
        });
      } catch (e) {
        openingRef.current.delete(path);
        fail(e);
      }
    },
    [fail],
  );

  const openFolder = useCallback(async () => {
    if (!available) return;
    try {
      const picked = await pickFolder();
      if (picked) await openPath(picked);
    } catch (e) {
      fail(e);
    }
  }, [available, openPath, fail]);

  const closeRoot = useCallback((id: string) => {
    const root = rootsRef.current.find((r) => r.id === id);
    if (!root) return;
    if (root.watchId) void unwatchPath(root.watchId).catch(() => undefined);
    openingRef.current.delete(root.path);
    setRoots((prev) => {
      const next = prev.filter((r) => r.id !== id);
      persistRootPaths(next.map((r) => r.path));
      return next;
    });
    setEntries((e) => pruneSubtree(e, root.path));
    setLoadedDirs((s) => pruneSet(s, root.path));
    setExpanded((s) => pruneSet(s, root.path));
  }, []);

  const toggleDir = useCallback(
    (path: string) => {
      const dir = normalizePath(path);
      const isOpen = expanded.has(dir);
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(dir)) next.delete(dir);
        else next.add(dir);
        return next;
      });
      if (!isOpen && !loadedDirs.has(dir)) {
        setLoadedDirs((prev) => new Set(prev).add(dir));
        void refreshDir(dir);
      }
    },
    [expanded, loadedDirs, refreshDir],
  );

  const openFile = useCallback(
    async (rawPath: string) => {
      const path = normalizePath(rawPath);
      if (docs.has(path)) {
        setActive(path);
        return;
      }
      try {
        const { content, mtimeMs } = await readFile(path);
        setDocs((prev) => {
          const next = new Map(prev);
          next.set(path, { path, disk: content, draft: content, mtimeMs, dirty: false, external: 'none' });
          return next;
        });
        setActive(path);
      } catch (e) {
        fail(e);
      }
    },
    [docs, fail],
  );

  const setActivePath = useCallback((path: string) => setActive(path), []);

  const closeDoc = useCallback((path: string) => {
    const target = normalizePath(path);
    // Compute the neighbor that should take focus from the current ordering
    // before mutating, so the two state updates stay pure and independent.
    const ordered = Array.from(docsRef.current.keys());
    const idx = ordered.indexOf(target);
    const remaining = ordered.filter((p) => p !== target);
    const neighbor = remaining.length === 0 ? null : remaining[Math.min(idx, remaining.length - 1)] ?? null;
    setDocs((prev) => {
      if (!prev.has(target)) return prev;
      const next = new Map(prev);
      next.delete(target);
      return next;
    });
    setActive((cur) => (cur === target ? neighbor : cur));
  }, []);

  const setDraft = useCallback((path: string, text: string) => {
    const target = normalizePath(path);
    setDocs((prev) => {
      const doc = prev.get(target);
      if (!doc) return prev;
      const next = new Map(prev);
      next.set(target, { ...doc, draft: text, dirty: text !== doc.disk });
      return next;
    });
  }, []);

  const save = useCallback(
    async (path: string) => {
      const target = normalizePath(path);
      const doc = docsRef.current.get(target);
      if (!doc) return;
      try {
        const { mtimeMs } = await writeFile(target, doc.draft);
        setDocs((prev) => {
          const current = prev.get(target);
          if (!current) return prev;
          const next = new Map(prev);
          next.set(target, { ...current, disk: current.draft, mtimeMs, dirty: false, external: 'none' });
          return next;
        });
      } catch (e) {
        fail(e);
      }
    },
    [fail],
  );

  const saveAll = useCallback(async () => {
    const dirty = Array.from(docsRef.current.values()).filter((d) => d.dirty);
    for (const doc of dirty) {
      // Sequential keeps disk writes and mtime updates ordered and predictable.
      await save(doc.path);
    }
  }, [save]);

  const reload = useCallback(
    async (path: string) => {
      const target = normalizePath(path);
      try {
        const { content, mtimeMs } = await readFile(target);
        setDocs((prev) => {
          const doc = prev.get(target);
          if (!doc) return prev;
          const next = new Map(prev);
          next.set(target, { ...doc, disk: content, draft: content, mtimeMs, dirty: false, external: 'none' });
          return next;
        });
      } catch (e) {
        fail(e);
      }
    },
    [fail],
  );

  const keepMine = useCallback((path: string) => {
    const target = normalizePath(path);
    setDocs((prev) => {
      const doc = prev.get(target);
      if (!doc) return prev;
      const next = new Map(prev);
      next.set(target, { ...doc, external: 'none' });
      return next;
    });
  }, []);

  const newFile = useCallback(
    async (dir: string, name: string) => {
      const path = joinPath(normalizePath(dir), name);
      try {
        await createFile(path);
        await refreshDir(normalizePath(dir));
        await openFile(path);
      } catch (e) {
        fail(e);
      }
    },
    [refreshDir, openFile, fail],
  );

  const newFolder = useCallback(
    async (dir: string, name: string) => {
      const path = joinPath(normalizePath(dir), name);
      try {
        await createDir(path);
        await refreshDir(normalizePath(dir));
        setExpanded((prev) => new Set(prev).add(normalizePath(dir)));
      } catch (e) {
        fail(e);
      }
    },
    [refreshDir, fail],
  );

  const rename = useCallback(
    async (path: string, nextName: string) => {
      const from = normalizePath(path);
      const dir = parentDir(from);
      const to = joinPath(dir, nextName);
      if (to === from) return;
      try {
        await renamePath(from, to);
        await refreshDir(dir);
        // Re-key the renamed path and, for a directory rename, every open
        // document nested under it; remap the active selection the same way.
        setEntries((prev) => pruneSubtree(prev, from));
        setLoadedDirs((s) => pruneSet(s, from));
        setExpanded((s) => pruneSet(s, from));
        setDocs((prev) => rekeySubtree(prev, from, to) ?? prev);
        setActive((cur) => remapActive(cur, from, to));
      } catch (e) {
        fail(e);
      }
    },
    [refreshDir, fail],
  );

  const remove = useCallback(
    async (path: string) => {
      const target = normalizePath(path);
      try {
        await deletePath(target);
        await refreshDir(parentDir(target));
        setEntries((prev) => pruneSubtree(prev, target));
        setLoadedDirs((s) => pruneSet(s, target));
        setExpanded((s) => pruneSet(s, target));
        // Close any docs under the deleted path.
        setDocs((prev) => {
          let changed = false;
          const next = new Map(prev);
          for (const key of prev.keys()) {
            if (key === target || key.startsWith(`${target}/`)) {
              next.delete(key);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      } catch (e) {
        fail(e);
      }
    },
    [refreshDir, fail],
  );

  const duplicate = useCallback(
    async (path: string) => {
      const from = normalizePath(path);
      const dir = parentDir(from);
      const siblings = Array.from(entries.values())
        .filter((e) => parentDir(e.path) === dir)
        .map((e) => e.name);
      const to = deriveDuplicatePath(from, siblings);
      try {
        await copyPath(from, to);
        await refreshDir(dir);
      } catch (e) {
        fail(e);
      }
    },
    [entries, refreshDir, fail],
  );

  const move = useCallback(
    async (from: string, toDir: string) => {
      const source = normalizePath(from);
      const dir = normalizePath(toDir);
      const reason = validateMove(source, dir);
      if (reason) {
        setError(reason);
        return;
      }
      const to = joinPath(dir, basePathName(source));
      try {
        await renamePath(source, to);
        await refreshDir(parentDir(source));
        await refreshDir(dir);
        setEntries((prev) => pruneSubtree(prev, source));
        setLoadedDirs((s) => pruneSet(s, source));
        setExpanded((s) => pruneSet(s, source));
        // Re-key any open document at or under the moved path to its new home.
        setDocs((prev) => rekeySubtree(prev, source, to) ?? prev);
        setActive((cur) => remapActive(cur, source, to));
      } catch (e) {
        fail(e);
      }
    },
    [refreshDir, fail],
  );

  // Restore the last session's roots once, on mount inside the native shell.
  useEffect(() => {
    if (!available) return;
    const saved = loadRootPaths();
    for (const path of saved) void openPath(path);
    // openPath is intentionally excluded; this runs once for the saved set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available]);

  // Persist the open roots whenever they change.
  useEffect(() => {
    persistRootPaths(roots.map((r) => r.path));
  }, [roots]);

  // Reconcile the tree and open buffers from live filesystem events.
  useEffect(() => {
    if (!available) return;
    let unlisten: (() => void) | undefined;
    let disposed = false;
    void onFsChanged((change) => {
      const path = normalizePath(change.path);
      const dir = parentDir(path);
      if (loadedRef.current.has(dir)) void refreshDir(dir, true);
      if (loadedRef.current.has(path)) void refreshDir(path, true);

      const doc = docsRef.current.get(path);
      if (!doc) return;
      if (change.kind === 'deleted') {
        setDocs((prev) => {
          const cur = prev.get(path);
          if (!cur) return prev;
          const next = new Map(prev);
          next.set(path, { ...cur, external: 'deleted' });
          return next;
        });
      } else if (change.kind === 'modified') {
        if (!doc.dirty) {
          void reload(path);
        } else {
          setDocs((prev) => {
            const cur = prev.get(path);
            if (!cur) return prev;
            const next = new Map(prev);
            next.set(path, { ...cur, external: 'changed' });
            return next;
          });
        }
      }
    }).then((fn) => {
      if (disposed) fn();
      else unlisten = fn;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [available, refreshDir, reload]);

  const tree = useMemo(
    () => buildWorkspaceTree(roots.map((r) => ({ path: r.path, name: r.name })), entries),
    [roots, entries],
  );

  const activeDoc = activePath ? docs.get(activePath) ?? null : null;

  // Memoized so the API object identity is stable unless its contents change;
  // this keeps consumers (the command registry, effects) from rebuilding every
  // render while still updating when state actually moves.
  return useMemo<WorkspaceApi>(
    () => ({
      available,
      roots,
      recents,
      tree,
      expanded,
      docs,
      activePath,
      activeDoc,
      error,
      clearError,
      openFolder,
      openPath,
      closeRoot,
      toggleDir,
      openFile,
      setActivePath,
      closeDoc,
      setDraft,
      save,
      saveAll,
      reload,
      keepMine,
      newFile,
      newFolder,
      rename,
      remove,
      duplicate,
      move,
    }),
    [
      available,
      roots,
      recents,
      tree,
      expanded,
      docs,
      activePath,
      activeDoc,
      error,
      clearError,
      openFolder,
      openPath,
      closeRoot,
      toggleDir,
      openFile,
      setActivePath,
      closeDoc,
      setDraft,
      save,
      saveAll,
      reload,
      keepMine,
      newFile,
      newFolder,
      rename,
      remove,
      duplicate,
      move,
    ],
  );
}
