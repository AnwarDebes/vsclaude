import { useEffect, useRef, useState } from 'react';
import { breadcrumbSegments, crumbFolderPath, folderChildren } from '../lib/breadcrumbs';
import { FileIcon } from './FileIcon';

export interface BreadcrumbsProps {
  path: string;
  /** Workspace root to strip so the trail is relative. */
  root?: string;
  /** Flat list of known paths, for the folder dropdown pickers. */
  entries?: ReadonlyArray<{ path: string; kind: 'file' | 'directory' }>;
  /** Open a file chosen from a folder dropdown. */
  onOpen?: (path: string) => void;
  /** Open the document symbol picker from the file segment. */
  onSymbols: () => void;
}

/**
 * The breadcrumb trail above the editor: the active file's folders and name. The
 * file segment opens the document symbol picker (Go to Symbol). A folder segment
 * opens a dropdown of that folder's contents; choosing a file opens it, and a
 * subfolder drills the dropdown into it.
 */
export function Breadcrumbs({ path, root, entries = [], onOpen, onSymbols }: BreadcrumbsProps) {
  const crumbs = breadcrumbSegments(path, root);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuFolder, setMenuFolder] = useState('');
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openMenu]);

  if (crumbs.length === 0) return null;

  const toggleMenu = (crumbPath: string) => {
    if (openMenu === crumbPath) {
      setOpenMenu(null);
    } else {
      setOpenMenu(crumbPath);
      // Resolve to the entry namespace (absolute when a workspace root is set) so the
      // dropdown matches the tree's paths; subfolder drilling already uses entry paths.
      setMenuFolder(crumbFolderPath(root, crumbPath));
    }
  };

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumbs" ref={navRef}>
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.path} className="breadcrumbs__crumb">
            {i > 0 ? (
              <span className="breadcrumbs__sep" aria-hidden>
                /
              </span>
            ) : null}
            {isLast ? (
              <button
                type="button"
                className="breadcrumbs__file"
                title="Go to Symbol"
                onClick={onSymbols}
              >
                <FileIcon name={crumb.name} isDirectory={false} />
                {crumb.name}
              </button>
            ) : (
              <button
                type="button"
                className="breadcrumbs__folder"
                aria-haspopup="menu"
                aria-expanded={openMenu === crumb.path}
                onClick={() => toggleMenu(crumb.path)}
              >
                {crumb.name}
              </button>
            )}
            {openMenu === crumb.path ? (
              <div className="breadcrumbs__menu" role="menu" aria-label={`${crumb.name} contents`}>
                {folderChildren(entries, menuFolder).length === 0 ? (
                  <span className="breadcrumbs__menu-empty">No items</span>
                ) : (
                  folderChildren(entries, menuFolder).map((child) => (
                    <button
                      key={child.path}
                      type="button"
                      role="menuitem"
                      className="breadcrumbs__menu-item"
                      onClick={() => {
                        if (child.kind === 'directory') {
                          setMenuFolder(child.path);
                        } else {
                          onOpen?.(child.path);
                          setOpenMenu(null);
                        }
                      }}
                    >
                      <FileIcon name={child.name} isDirectory={child.kind === 'directory'} />
                      {child.name}
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </span>
        );
      })}
    </nav>
  );
}
