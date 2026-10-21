
import { lazyWithRetry } from '@/lib/lazy-with-retry';
/**
 * The arena's code (Streamdown, the history, the composer...) loads only for signed-in visitors
 * who get the arena, as its own chunk: the landing page does not pay for it.
 */
export const LazyArenaApp = lazyWithRetry(() =>
  import('./arena-app').then(module => ({ default: module.ArenaApp })),
);
