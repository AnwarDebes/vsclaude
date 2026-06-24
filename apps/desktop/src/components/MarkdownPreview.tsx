import { useEffect } from 'react';
import { renderMarkdown } from '../lib/markdown';

export interface MarkdownTarget {
  name: string;
  markdown: string;
}

export interface MarkdownPreviewProps {
  target: MarkdownTarget | null;
  onClose: () => void;
}

/**
 * A rendered Markdown preview of a file. The HTML comes from the safe renderer
 * (renderMarkdown escapes raw HTML and sanitizes link hrefs), so injecting it is
 * not a script vector. Escape closes it.
 */
export function MarkdownPreview({ target, onClose }: MarkdownPreviewProps) {
  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, onClose]);

  if (!target) return null;

  return (
    <div className="md-overlay" role="dialog" aria-label={`Preview of ${target.name}`} onClick={onClose}>
      <div className="md-modal" onClick={(e) => e.stopPropagation()}>
        <header className="md-modal__header">
          <h2 className="md-modal__title">{target.name}</h2>
          <button type="button" className="btn btn--ghost" aria-label="Close preview" onClick={onClose}>
            Close
          </button>
        </header>
        <div
          className="md-modal__body markdown-body"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(target.markdown) }}
        />
      </div>
    </div>
  );
}
