import { useEffect } from 'react';

export interface ImageTarget {
  name: string;
  /** An image source URL (a data URL for SVG text). */
  src: string;
}

export interface ImagePreviewProps {
  target: ImageTarget | null;
  onClose: () => void;
}

/** A simple image viewer. The src is an <img> source, so SVG renders safely. */
export function ImagePreview({ target, onClose }: ImagePreviewProps) {
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
    <div className="image-overlay" role="dialog" aria-label={`Preview of ${target.name}`} onClick={onClose}>
      <div className="image-modal" onClick={(e) => e.stopPropagation()}>
        <header className="image-modal__header">
          <h2 className="image-modal__title">{target.name}</h2>
          <button type="button" className="btn btn--ghost" aria-label="Close preview" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="image-modal__body">
          <img className="image-modal__img" src={target.src} alt={target.name} />
        </div>
      </div>
    </div>
  );
}
