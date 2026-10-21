import { useSyncExternalStore } from 'react';

let current = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void): () => void {
  current = Date.now();
  listeners.add(listener);
  timer ??= setInterval(() => {
    current = Date.now();
    for (const item of listeners) item();
  }, 60_000);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/** The current time, refreshed every minute (date groups and "14:05" labels). */
export function useNow(): number {
  return useSyncExternalStore(
    subscribe,
    () => current || Date.now(),
    () => 0,
  );
}
