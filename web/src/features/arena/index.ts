// Public API of the arena feature: the signed-in arena at `/` (slices S8 and S9), loaded lazily,
// its loading frame, and the hook that decides between the landing page and the arena.
export { ArenaBoot } from './components/arena-boot';
export { LazyArenaApp } from './components/lazy-arena-app';
export { type HomeView, useHomeView } from './hooks/use-home-view';
