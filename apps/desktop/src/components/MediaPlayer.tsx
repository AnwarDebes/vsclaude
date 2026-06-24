import { useEffect, useState } from 'react';
import type { MediaKind } from '../lib/media';

export interface MediaTarget {
  name: string;
  /** A media source URL (a data URL in the browser demo). */
  src: string;
  kind: MediaKind;
}

export interface MediaPlayerProps {
  target: MediaTarget | null;
  onClose: () => void;
}

/**
 * A media player for audio and video files. It renders the standard browser
 * controls for the matching element and shows a message if the source fails to
 * load. The src is a media URL (a data URL in the browser demo).
 */
export function MediaPlayer({ target, onClose }: MediaPlayerProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
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
    <div className="media-overlay" role="dialog" aria-label={`Media player for ${target.name}`} onClick={onClose}>
      <div className="media-modal" onClick={(e) => e.stopPropagation()}>
        <header className="media-modal__header">
          <h2 className="media-modal__title">{target.name}</h2>
          <button type="button" className="btn btn--ghost" aria-label="Close media player" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="media-modal__body">
          {failed ? (
            <p className="media-modal__error" role="alert">
              Could not load this media file.
            </p>
          ) : target.kind === 'audio' ? (
            <audio
              className="media-modal__audio"
              aria-label={target.name}
              src={target.src}
              controls
              onError={() => setFailed(true)}
            />
          ) : (
            <video
              className="media-modal__video"
              aria-label={target.name}
              src={target.src}
              controls
              onError={() => setFailed(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
