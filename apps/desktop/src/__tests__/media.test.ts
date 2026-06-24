import { describe, expect, it } from 'vitest';
import {
  AUDIO_EXTENSIONS,
  isAudioPath,
  isMediaPath,
  isVideoPath,
  mediaKind,
  VIDEO_EXTENSIONS,
} from '../lib/media';

describe('isAudioPath / isVideoPath', () => {
  it('matches audio extensions case-insensitively', () => {
    expect(isAudioPath('assets/chime.wav')).toBe(true);
    expect(isAudioPath('Song.MP3')).toBe(true);
    expect(isAudioPath('clip.mp4')).toBe(false);
  });

  it('matches video extensions case-insensitively', () => {
    expect(isVideoPath('intro.mp4')).toBe(true);
    expect(isVideoPath('Clip.WEBM')).toBe(true);
    expect(isVideoPath('chime.wav')).toBe(false);
  });

  it('recognizes every declared extension (guards against a typo in the lists)', () => {
    for (const ext of AUDIO_EXTENSIONS) {
      expect(isAudioPath(`a${ext}`)).toBe(true);
    }
    for (const ext of VIDEO_EXTENSIONS) {
      expect(isVideoPath(`v${ext}`)).toBe(true);
    }
  });

  it('keeps the audio and video lists disjoint (mediaKind precedence relies on it)', () => {
    const overlap = AUDIO_EXTENSIONS.filter((ext) => VIDEO_EXTENSIONS.includes(ext));
    expect(overlap).toEqual([]);
  });
});

describe('isMediaPath', () => {
  it('accepts audio and video, rejects other files', () => {
    expect(isMediaPath('chime.wav')).toBe(true);
    expect(isMediaPath('intro.mp4')).toBe(true);
    expect(isMediaPath('logo.svg')).toBe(false);
    expect(isMediaPath('readme.md')).toBe(false);
  });
});

describe('mediaKind', () => {
  it('classifies a path or returns null', () => {
    expect(mediaKind('chime.wav')).toBe('audio');
    expect(mediaKind('intro.mp4')).toBe('video');
    expect(mediaKind('app.tsx')).toBe(null);
  });

  it('disambiguates the shared ogg container family', () => {
    expect(mediaKind('song.ogg')).toBe('audio');
    expect(mediaKind('movie.ogv')).toBe('video');
    expect(isVideoPath('song.ogg')).toBe(false);
    expect(isAudioPath('movie.ogv')).toBe(false);
  });
});
