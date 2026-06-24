import { useEffect, useState } from 'react';
import { clampZoom, zoomPercent, ZOOM_STEP } from '../lib/preview';

export interface ImageTarget {
  name: string;
  /** An image source URL (a data URL for SVG text or a raster image). */
  src: string;
}

export interface ImagePreviewProps {
  target: ImageTarget | null;
  onClose: () => void;
}

interface Dimensions {
  width: number;
  height: number;
}

/**
 * An image viewer for raster images and SVGs. The src is an <img> source, so SVG
 * renders safely (no inline script). It reports the natural pixel dimensions once
 * the image loads, supports zooming in and out within a clamped range, and shows
 * a message when the source fails to decode.
 */
export function ImagePreview({ target, onClose }: ImagePreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [dimensions, setDimensions] = useState<Dimensions | null>(null);
  const [failed, setFailed] = useState(false);

  // Reset the view whenever a new image is opened.
  useEffect(() => {
    setZoom(1);
    setDimensions(null);
    setFailed(false);
  }, [target]);

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
        <div className="image-modal__toolbar">
          <button
            type="button"
            className="btn btn--ghost"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
          >
            -
          </button>
          {/* Self-describing text (a bare span does not expose aria-label to AT). */}
          <span className="image-modal__zoom" aria-live="polite">
            Zoom {zoomPercent(zoom)}
          </span>
          <button
            type="button"
            className="btn btn--ghost"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
          >
            +
          </button>
          <button type="button" className="btn btn--ghost" aria-label="Reset zoom" onClick={() => setZoom(1)}>
            Reset
          </button>
          {dimensions ? (
            <span className="image-modal__dims">
              {dimensions.width} x {dimensions.height} px
            </span>
          ) : null}
        </div>
        <div className="image-modal__body">
          {failed ? (
            <p className="image-modal__error" role="alert">
              Could not load this image.
            </p>
          ) : (
            <img
              className="image-modal__img"
              src={target.src}
              alt={target.name}
              style={{ transform: `scale(${zoom})` }}
              onLoad={(e) =>
                setDimensions({
                  width: e.currentTarget.naturalWidth,
                  height: e.currentTarget.naturalHeight,
                })
              }
              onError={() => setFailed(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
