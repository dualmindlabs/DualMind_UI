import { lazy } from 'react';

/**
 * The arena's code (Streamdown, the history, the composer...) loads only for signed-in visitors
 * who get the arena, as its own chunk: the landing page does not pay for it.
 */
export const LazyArenaApp = lazy(() =>
  import('./arena-app').then(module => ({ default: module.ArenaApp })),
);
