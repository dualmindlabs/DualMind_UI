import { lazy, Suspense } from 'react';

import { useHydrated } from '@/hooks/use-hydrated';

// Sonner and the toast styles are a separate chunk, loaded after the page has hydrated.
const Toaster = lazy(() =>
  import('@/components/ui/sonner').then(module => ({ default: module.Toaster })),
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
