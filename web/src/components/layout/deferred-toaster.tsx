import { Suspense } from 'react';

import { useHydrated } from '@/hooks/use-hydrated';
import { lazyWithRetry } from '@/lib/lazy-with-retry';

// Sonner and the toast styles are a separate chunk, loaded after the page has hydrated.
const Toaster = lazyWithRetry(
  () => import('@/components/ui/sonner').then(module => ({ default: module.Toaster })),
  { silent: true },
);

/** The toaster, mounted once the page is interactive: no toast can be raised before that. */
export function DeferredToaster() {
  const hydrated = useHydrated();
  return hydrated ? (
    <Suspense fallback={null}>
      <Toaster />
    </Suspense>
  ) : null;
}
