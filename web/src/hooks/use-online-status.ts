import { useSyncExternalStore } from 'react';

import { isOnline, subscribeOnline } from '@/lib/network/online-status';

/** False while the browser reports no network (`navigator.onLine`, `online`/`offline` events). */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribeOnline, isOnline, () => true);
}
