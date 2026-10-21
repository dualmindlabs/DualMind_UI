import { useCallback, useSyncExternalStore } from 'react';

/**
 * A value kept in localStorage and shared by every component (and tab) that reads the same key.
 * Reading never throws: blocked storage falls back to an in-memory copy for this page.
 */

const memory = new Map<string, string | null>();
const listeners = new Map<string, Set<() => void>>();

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readStored(key: string): string | null {
  if (memory.has(key)) return memory.get(key) ?? null;
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function notify(key: string) {
  for (const listener of listeners.get(key) ?? []) listener();
}

export function writeStored(key: string, value: string | null): void {
  memory.set(key, value);
  const target = storage();
  if (target) {
    try {
      if (value === null) target.removeItem(key);
      else target.setItem(key, value);
      // Stored for real: later reads go to storage again (and see other tabs' changes).
      memory.delete(key);
    } catch {
      // Blocked or full storage: keep the in-memory copy.
    }
  }
  notify(key);
}

function subscribeTo(key: string, listener: () => void): () => void {
  const set = listeners.get(key) ?? new Set();
  set.add(listener);
  listeners.set(key, set);
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    set.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/**
 * The stored string for `key` (null when unset), and a setter. Prerendering reads null; the arena
 * renders only in the browser, so this matters for tests only.
 */
export function useStoredValue(key: string): [string | null, (value: string | null) => void] {
  const subscribe = useCallback((listener: () => void) => subscribeTo(key, listener), [key]);
  const value = useSyncExternalStore(
    subscribe,
    () => readStored(key),
    () => null,
  );
  const setValue = useCallback((next: string | null) => writeStored(key, next), [key]);
  return [value, setValue];
}
