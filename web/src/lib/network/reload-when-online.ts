/**
 * The last resort for a page that crashed because the network dropped (or a chunk it needed
 * never arrived): reload it once, when the browser says it is back online. Loop-guarded with a
 * sessionStorage stamp, so a page that crashes again for another reason is not reloaded forever.
 */
export const RELOAD_GUARD_KEY = 'dm.reload-on-online';
/** A second automatic reload within this window is skipped. */
export const RELOAD_GUARD_MS = 60_000;

export interface ReloadWhenOnlineOptions {
  reload?: (() => void) | undefined;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null | undefined;
  now?: (() => number) | undefined;
  target?: Pick<EventTarget, 'addEventListener' | 'removeEventListener'> | undefined;
}

function tabStorage(): Pick<Storage, 'getItem' | 'setItem'> | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Starts listening for `online`; returns the function that stops. */
export function reloadWhenOnline(options: ReloadWhenOnlineOptions = {}): () => void {
  const target = options.target ?? (typeof window === 'undefined' ? undefined : window);
  if (!target) return () => {};
  const storage = options.storage === undefined ? tabStorage() : options.storage;
  const now = options.now ?? Date.now;
  const reload = options.reload ?? (() => window.location.reload());

  const onOnline = () => {
    if (!storage) return;
    try {
      const last = Number(storage.getItem(RELOAD_GUARD_KEY) ?? 0);
      if (last > 0 && now() - last < RELOAD_GUARD_MS) return;
      storage.setItem(RELOAD_GUARD_KEY, String(now()));
    } catch {
      // Blocked storage: no guard is possible, so do not risk a loop.
      return;
    }
    reload();
  };
  target.addEventListener('online', onOnline);
  return () => target.removeEventListener('online', onOnline);
}
