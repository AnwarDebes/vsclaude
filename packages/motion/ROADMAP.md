# @vsclaude/motion roadmap

This package currently ships the pure logic layer. Future milestones add the
rendering and integration work that consumes `MotionDirective`s.

## Now (shipped)

- Pure `captionFor`, `intensityFor`, `moodFor`.
- Stateful `Mapper` with priority, minimum dwell, and debouncing.
- `mapEvents` batch replay with an injected clock.
- Full Vitest coverage of the mapping rules.

## Next

- A directive smoothing layer: ease intensity and gaze between frames instead of
  stepping, so transitions read as motion rather than snaps.
- Caption localization and a pluggable caption template registry.
- A subscription based reactive wrapper that emits directives to listeners as
  events arrive, for the React or native renderer to consume.

## Later

- The React or native rendering integration: sprite and animation playback wired
  to directive state, mood, intensity, and gaze. This is intentionally kept out
  of this package so the logic stays dependency free and testable.
- Per provider tuning profiles for dwell and debounce timings.
- Telemetry hooks to measure how often states flicker in real sessions and feed
  the timing defaults.
