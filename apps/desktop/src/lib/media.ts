/**
 * Helpers for the media player. Audio and video files are matched by extension so
 * the right element (<audio> or <video>) is rendered from a media source. Pure, so
 * it is unit tested.
 */
export const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'];
export const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogv', '.mov', '.mkv'];

export type MediaKind = 'audio' | 'video';

function hasExtension(path: string, extensions: readonly string[]): boolean {
  const lower = path.toLowerCase();
  return extensions.some((ext) => lower.endsWith(ext));
}

export function isAudioPath(path: string): boolean {
  return hasExtension(path, AUDIO_EXTENSIONS);
}

export function isVideoPath(path: string): boolean {
  return hasExtension(path, VIDEO_EXTENSIONS);
}

export function isMediaPath(path: string): boolean {
  return isAudioPath(path) || isVideoPath(path);
}

/** Which media element a path should render in, or null when it is not media. */
export function mediaKind(path: string): MediaKind | null {
  if (isAudioPath(path)) return 'audio';
  if (isVideoPath(path)) return 'video';
  return null;
}
