import { useMemo, useState } from 'react';
import type { FsEntry } from '@vsclaude/contracts';
import { buildFileTree, collectDirectoryPaths, flattenVisible, toggleExpanded } from '@vsclaude/editor';

interface ExplorerPanelProps {
  files: FsEntry[];
  /** The path the agent most recently touched, highlighted in the tree. */
  activePath?: string;
  /** The path currently open in the editor. */
  openPath?: string;
  /** Called when a file (not a directory) is clicked. */
  onSelect?: (path: string) => void;
}

/**
 * The file explorer, built from the editor package's pure tree model: directories
 * sort before files, deep paths synthesize their parents, and collapsed folders
 * hide their descendants. The file the agent is touching is highlighted.
 */
export function ExplorerPanel({ files, activePath, openPath, onSelect }: ExplorerPanelProps) {
  const tree = useMemo(() => buildFileTree(files), [files]);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => collectDirectoryPaths(tree));
  const rows = useMemo(() => flattenVisible(tree, expanded), [tree, expanded]);

  return (
    <nav className="explorer-panel" aria-label="Files">
      <h2 className="panel-title">Explorer</h2>
      <ul className="explorer-list">
        {rows.map((row) => {
          const active = row.node.path === openPath || row.node.path === activePath;
          return (
            <li key={row.node.path}>
              <button
                type="button"
                className={`explorer-row${active ? ' explorer-row--active' : ''}`}
                style={{ paddingLeft: `${8 + row.depth * 14}px` }}
                onClick={() =>
                  row.node.isDirectory
                    ? setExpanded((s) => toggleExpanded(s, row.node.path))
                    : onSelect?.(row.node.path)
                }
              >
                <span className="explorer-row__glyph" aria-hidden>
                  {row.node.isDirectory ? (row.expanded ? '▾' : '▸') : '•'}
                </span>
                <span className="explorer-row__name">{row.node.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
