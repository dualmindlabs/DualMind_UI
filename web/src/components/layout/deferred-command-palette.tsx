import { Suspense } from 'react';

import { useCommandPalette } from '@/hooks/use-command-palette';
import { useHydrated } from '@/hooks/use-hydrated';
import { lazyWithRetry } from '@/lib/lazy-with-retry';

// The palette's code (cmdk, the dialog primitives, its icons) is a separate chunk.
const CommandPalette = lazyWithRetry(
  () =>
    import('@/components/layout/command-palette').then(module => ({
      default: module.CommandPalette,
    })),
  { silent: true },
);

/**
 * Keeps the command palette's code out of what pages load up front: its chunk is requested right
 * after hydration (or when it is opened first, which can only happen after hydration) and the
 * palette mounts closed, so the first open is as instant as every later one.
 */
export function DeferredCommandPalette() {
  const { open } = useCommandPalette();
  const hydrated = useHydrated();

  return hydrated || open ? (
    <Suspense fallback={null}>
      <CommandPalette />
    </Suspense>
  ) : null;
}
