// Public API of the arena feature: the signed-in arena at `/` (slices S8 and S9), loaded lazily,
// its loading frame, the hook that decides between the landing page and the arena, and the
// read-only transcript the share page renders (slice S11).
export { ArenaBoot } from './components/arena-boot';
export { LazyArenaApp } from './components/lazy-arena-app';
export { ThreadTranscript, type ThreadTranscriptProps } from './components/thread-transcript';
export { type HomeView, useHomeView } from './hooks/use-home-view';
