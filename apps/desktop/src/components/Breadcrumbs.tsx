import { breadcrumbSegments } from '../lib/breadcrumbs';
import { FileIcon } from './FileIcon';

export interface BreadcrumbsProps {
  path: string;
  /** Workspace root to strip so the trail is relative. */
  root?: string;
  /** Open the document symbol picker from the file segment. */
  onSymbols: () => void;
}

/**
 * The breadcrumb trail above the editor: the active file's folders and name. The
 * file segment opens the document symbol picker (Go to Symbol). Folder segments
 * are shown for orientation.
 */
export function Breadcrumbs({ path, root, onSymbols }: BreadcrumbsProps) {
  const crumbs = breadcrumbSegments(path, root);
  if (crumbs.length === 0) return null;

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumbs">
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
              <span className="breadcrumbs__folder">{crumb.name}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
