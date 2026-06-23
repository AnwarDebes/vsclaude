import { useEffect, useMemo, useRef, useState } from 'react';
import { flattenVisible, parentDir } from '@vsclaude/editor';
import type { WorkspaceApi } from '../workspace/useWorkspace';
import { ContextMenu, type MenuItem } from './ContextMenu';

interface WorkspaceExplorerProps {
  ws: WorkspaceApi;
}

interface MenuState {
  x: number;
  y: number;
  path: string;
  name: string;
  isDirectory: boolean;
  isRoot: boolean;
}

interface CreateState {
  dir: string;
  kind: 'file' | 'folder';
}

/**
 * The file explorer for an open workspace: a lazily loaded tree backed by the
 * Rust core. Directories expand on demand, files open into tabs, and the full set
 * of file operations is available from the context menu, inline editors, and drag
 * and drop. The tree is a single tab stop with arrow-key roving focus; dirty files
 * show a marker; the file the agent touches is highlighted; operations are
 * announced to assistive tech through a polite live region.
 */
export function WorkspaceExplorer({ ws }: WorkspaceExplorerProps) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [creating, setCreating] = useState<CreateState | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const rowRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());

  const rows = useMemo(() => flattenVisible(ws.tree, ws.expanded), [ws.tree, ws.expanded]);
  const dirtyPaths = useMemo(() => {
    const set = new Set<string>();
    for (const doc of ws.docs.values()) if (doc.dirty) set.add(doc.path);
    return set;
  }, [ws.docs]);

  // Keep the roving index in range as the visible rows change.
  useEffect(() => {
    setActiveIndex((i) => Math.max(0, Math.min(i, rows.length - 1)));
  }, [rows.length]);

  const announce = (message: string) => setAnnouncement(message);

  const focusRow = (index: number) => {
    const clamped = Math.max(0, Math.min(index, rows.length - 1));
    setActiveIndex(clamped);
    const path = rows[clamped]?.node.path;
    if (path) rowRefs.current.get(path)?.focus();
  };

  const beginCreate = (dir: string, kind: 'file' | 'folder') => {
    setCreating({ dir, kind });
    setRenaming(null);
  };

  const onRowKeyDown = (event: React.KeyboardEvent, index: number, isRoot: boolean) => {
    const row = rows[index];
    if (!row) return;
    const { node } = row;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusRow(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusRow(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusRow(0);
        break;
      case 'End':
        event.preventDefault();
        focusRow(rows.length - 1);
        break;
      case 'ArrowRight':
        if (node.isDirectory && !row.expanded) {
          event.preventDefault();
          ws.toggleDir(node.path);
        } else if (node.isDirectory) {
          event.preventDefault();
          focusRow(index + 1);
        }
        break;
      case 'ArrowLeft':
        if (node.isDirectory && row.expanded) {
          event.preventDefault();
          ws.toggleDir(node.path);
        } else {
          event.preventDefault();
          const parent = parentDir(node.path);
          const parentIndex = rows.findIndex((r) => r.node.path === parent);
          focusRow(parentIndex >= 0 ? parentIndex : index - 1);
        }
        break;
      case 'F2':
        if (!isRoot) {
          event.preventDefault();
          setRenaming(node.path);
        }
        break;
      case 'Delete':
        if (!isRoot) {
          event.preventDefault();
          announce(`Deleting ${node.name}`);
          void ws.remove(node.path);
        }
        break;
      default:
        break;
    }
  };

  const menuItems = (state: MenuState): MenuItem[] => {
    const items: MenuItem[] = [];
    if (state.isDirectory) {
      items.push({ label: 'New File', onSelect: () => beginCreate(state.path, 'file') });
      items.push({ label: 'New Folder', onSelect: () => beginCreate(state.path, 'folder') });
    }
    if (!state.isRoot) {
      items.push({ label: 'Rename', onSelect: () => setRenaming(state.path) });
      items.push({
        label: 'Duplicate',
        onSelect: () => {
          announce(`Duplicating ${state.name}`);
          void ws.duplicate(state.path);
        },
      });
      items.push({
        label: 'Copy Path',
        onSelect: () => void navigator.clipboard?.writeText(state.path).catch(() => undefined),
      });
      items.push({
        label: 'Delete',
        danger: true,
        onSelect: () => {
          announce(`Deleting ${state.name}`);
          void ws.remove(state.path);
        },
      });
    } else {
      items.push({
        label: 'Close Folder',
        onSelect: () => {
          const root = ws.roots.find((r) => r.path === state.path);
          if (root) ws.closeRoot(root.id);
        },
      });
    }
    return items;
  };

  return (
    <nav className="workspace-explorer" aria-label="Files">
      <div className="workspace-explorer__head">
        <h2 className="panel-title">Explorer</h2>
        <div className="workspace-explorer__actions">
          {ws.roots.length > 0 ? (
            <button
              type="button"
              className="icon-btn"
              title="New File"
              aria-label="New File"
              onClick={() => ws.roots[0] && beginCreate(ws.roots[0].path, 'file')}
            >
              {'+'}
            </button>
          ) : null}
          <button
            type="button"
            className="icon-btn"
            title="Open Folder"
            aria-label="Open Folder"
            onClick={() => void ws.openFolder()}
          >
            {'…'}
          </button>
        </div>
      </div>

      {ws.roots.length === 0 ? (
        <div className="workspace-explorer__empty">
          <p>No folder open.</p>
          <button type="button" className="btn" onClick={() => void ws.openFolder()}>
            Open Folder
          </button>
        </div>
      ) : null}

      <ul className="explorer-list" role="tree" aria-label="Project files">
        {rows.map((row, index) => {
          const { node } = row;
          const isRoot = ws.roots.some((r) => r.path === node.path);
          const active = node.path === ws.activePath;
          const dirty = dirtyPaths.has(node.path);
          const isRenaming = renaming === node.path;
          return (
            <li
              key={node.path}
              role="treeitem"
              aria-level={row.depth + 1}
              aria-selected={active}
              aria-expanded={node.isDirectory ? row.expanded : undefined}
            >
              {isRenaming ? (
                <div className="explorer-row" style={{ paddingLeft: `${8 + row.depth * 14}px` }}>
                  <span className="explorer-row__glyph" aria-hidden>
                    {node.isDirectory ? '▸' : '•'}
                  </span>
                  <RenameInput
                    initial={node.name}
                    onCommit={(name) => {
                      setRenaming(null);
                      if (name && name !== node.name) {
                        announce(`Renaming ${node.name} to ${name}`);
                        void ws.rename(node.path, name);
                      }
                    }}
                    onCancel={() => setRenaming(null)}
                  />
                </div>
              ) : (
                <div
                  className={`explorer-row${active ? ' explorer-row--active' : ''}${
                    dragOver === node.path ? ' explorer-row--drop' : ''
                  }`}
                  style={{ paddingLeft: `${8 + row.depth * 14}px` }}
                  draggable={!isRoot}
                  onDragStart={(e) => e.dataTransfer.setData('text/vsclaude-path', node.path)}
                  onDragOver={(e) => {
                    if (node.isDirectory) {
                      e.preventDefault();
                      setDragOver(node.path);
                    }
                  }}
                  onDragLeave={() => setDragOver((cur) => (cur === node.path ? null : cur))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(null);
                    const from = e.dataTransfer.getData('text/vsclaude-path');
                    if (from && node.isDirectory) {
                      announce(`Moving into ${node.name}`);
                      void ws.move(from, node.path);
                    }
                  }}
                >
                  <button
                    type="button"
                    className="explorer-row__btn"
                    tabIndex={index === activeIndex ? 0 : -1}
                    ref={(el) => {
                      rowRefs.current.set(node.path, el);
                    }}
                    onFocus={() => setActiveIndex(index)}
                    onClick={() => {
                      if (node.isDirectory) ws.toggleDir(node.path);
                      else void ws.openFile(node.path);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setMenu({
                        x: e.clientX,
                        y: e.clientY,
                        path: node.path,
                        name: node.name,
                        isDirectory: node.isDirectory,
                        isRoot,
                      });
                    }}
                    onKeyDown={(e) => onRowKeyDown(e, index, isRoot)}
                  >
                    <span className="explorer-row__glyph" aria-hidden>
                      {node.isDirectory ? (row.expanded ? '▾' : '▸') : '•'}
                    </span>
                    <span className="explorer-row__name">{node.name}</span>
                    {dirty ? (
                      <span className="explorer-row__dirty" aria-label="Unsaved changes" />
                    ) : null}
                  </button>
                </div>
              )}
              {creating && creating.dir === node.path ? (
                <CreateInput
                  depth={row.depth + 1}
                  kind={creating.kind}
                  onCommit={(name) => {
                    const { dir, kind } = creating;
                    setCreating(null);
                    if (!name) return;
                    announce(`Creating ${name}`);
                    if (kind === 'file') void ws.newFile(dir, name);
                    else void ws.newFolder(dir, name);
                  }}
                  onCancel={() => setCreating(null)}
                />
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>

      {menu ? (
        <ContextMenu x={menu.x} y={menu.y} items={menuItems(menu)} onClose={() => setMenu(null)} />
      ) : null}
    </nav>
  );
}

function RenameInput({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <input
      className="explorer-input"
      autoFocus
      value={value}
      aria-label="New name"
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onCommit(value.trim())}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onCommit(value.trim());
        else if (e.key === 'Escape') onCancel();
        e.stopPropagation();
      }}
    />
  );
}

function CreateInput({
  depth,
  kind,
  onCommit,
  onCancel,
}: {
  depth: number;
  kind: 'file' | 'folder';
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  return (
    <div className="explorer-row" style={{ paddingLeft: `${8 + depth * 14}px` }}>
      <span className="explorer-row__glyph" aria-hidden>
        {kind === 'folder' ? '▸' : '•'}
      </span>
      <input
        className="explorer-input"
        autoFocus
        value={value}
        placeholder={kind === 'folder' ? 'folder name' : 'file name'}
        aria-label={kind === 'folder' ? 'New folder name' : 'New file name'}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => onCommit(value.trim())}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommit(value.trim());
          else if (e.key === 'Escape') onCancel();
        }}
      />
    </div>
  );
}
