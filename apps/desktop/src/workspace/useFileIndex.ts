/**
 * Builds the quick-open file index for the open workspace.
 *
 * It walks each open root through the Rust core's `fs.walk` and turns the file
 * paths into ranked quick-pick items: the file name is the label, the containing
 * folder (relative to the root) is the dim description, and the full relative
 * path is a keyword so typing a folder name still finds the file. The index
 * rebuilds when the set of roots changes, and `refresh` lets the palette pull a
 * fresh walk each time it opens so newly created files show up. Outside the Tauri
 * shell it stays empty and the app feeds the demo files in instead.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { QuickPickItem } from '@vsclaude/core-shell';
import { basePathName } from '@vsclaude/editor';
import { isTauri, walkDir } from './fsClient';

/** Turns one absolute file path into a quick-pick item, relative to its root. */
function toItem(path: string, rootPath: string): QuickPickItem {
  const rel = path.startsWith(`${rootPath}/`) ? path.slice(rootPath.length + 1) : basePathName(path);
  const slash = rel.lastIndexOf('/');
  const relativeDir = slash >= 0 ? rel.slice(0, slash) : '';
  return { id: path, label: basePathName(path), description: relativeDir, keywords: [rel] };
}

export interface FileIndex {
  items: QuickPickItem[];
  truncated: boolean;
  refresh: () => void;
}

export function useFileIndex(rootPaths: readonly string[]): FileIndex {
  const [items, setItems] = useState<QuickPickItem[]>([]);
  const [truncated, setTruncated] = useState(false);
  // Join the paths into a single dependency so the callback identity is stable
  // across renders that do not actually change the set of roots.
  const key = rootPaths.join('\n');
  const runningRef = useRef(false);

  const build = useCallback(async () => {
    const paths = key.length === 0 ? [] : key.split('\n');
    if (!isTauri() || paths.length === 0) {
      setItems([]);
      setTruncated(false);
      return;
    }
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      const all: QuickPickItem[] = [];
      let cut = false;
      for (const root of paths) {
        try {
          const result = await walkDir(root);
          for (const file of result.files) all.push(toItem(file, root));
          if (result.truncated) cut = true;
        } catch {
          // A root that cannot be walked (permission, vanished) is skipped rather
          // than failing the whole index.
        }
      }
      setItems(all);
      setTruncated(cut);
    } finally {
      runningRef.current = false;
    }
  }, [key]);

  useEffect(() => {
    void build();
  }, [build]);

  const refresh = useCallback(() => void build(), [build]);

  return { items, truncated, refresh };
}
