import { useEffect, useRef, useState } from 'react';
import {
  clampZoom,
  imageTransform,
  nextRotation,
  RESET_VIEW,
  zoomPercent,
  ZOOM_STEP,
} from '../lib/preview';

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
 * the image loads, supports zoom, rotate, and drag-to-pan within a clamped range,
 * and shows a message when the source fails to decode.
 */
export function ImagePreview({ target, onClose }: ImagePreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [dimensions, setDimensions] = useState<Dimensions | null>(null);
  const [failed, setFailed] = useState(false);
  // Drag-to-pan: the pointer position and pan offset captured when the drag began.
  const drag = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  const reset = () => {
    setZoom(RESET_VIEW.zoom);
    setRotation(RESET_VIEW.rotation);
    setPan({ x: RESET_VIEW.panX, y: RESET_VIEW.panY });
  };

  // Reset the view whenever a new image is opened.
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
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

  const onPanStart = (e: React.MouseEvent) => {
    drag.current = { startX: e.clientX, startY: e.clientY, baseX: pan.x, baseY: pan.y };
    setPanning(true);
  };
  const onPanMove = (e: React.MouseEvent) => {
    const d = drag.current;
    if (!d) return;
    setPan({ x: d.baseX + (e.clientX - d.startX), y: d.baseY + (e.clientY - d.startY) });
  };
  const onPanEnd = () => {
    drag.current = null;
    setPanning(false);
  };

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
          <button
            type="button"
            className="btn btn--ghost"
            aria-label="Rotate"
            onClick={() => setRotation((r) => nextRotation(r))}
          >
            Rotate
          </button>
          <button type="button" className="btn btn--ghost" aria-label="Reset view" onClick={reset}>
            Reset
          </button>
          {dimensions ? (
            <span className="image-modal__dims">
              {dimensions.width} x {dimensions.height} px
            </span>
          ) : null}
        </div>
        <div
          className="image-modal__body"
          onMouseDown={onPanStart}
          onMouseMove={onPanMove}
          onMouseUp={onPanEnd}
          onMouseLeave={onPanEnd}
        >
          {failed ? (
            <p className="image-modal__error" role="alert">
              Could not load this image.
            </p>
          ) : (
            <img
              className="image-modal__img"
              src={target.src}
              alt={target.name}
              draggable={false}
              style={{
                transform: imageTransform({ zoom, rotation, panX: pan.x, panY: pan.y }),
                // 1:1 tracking while dragging; the eased transition stays for zoom/rotate.
                transition: panning ? 'none' : undefined,
              }}
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
