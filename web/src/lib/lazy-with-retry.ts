/**
 * `React.lazy` that survives a flaky network. A plain lazy component caches a rejected import
 * for good: a chunk first requested while offline throws into the nearest error boundary (the
 * whole page, at the root) and never loads again. These helpers wait for the `online` event when
 * the browser is offline, retry with backoff otherwise, and for decorative components resolve to
 * nothing instead of throwing, so an effect can never take the page down.
 */
import { type ComponentType, lazy, type LazyExoticComponent } from 'react';

import { isOnline, waitForOnline } from '@/lib/network/online-status';

export interface RetryOptions {
  /** Failed attempts while online before giving up. Default 3. */
  retries?: number;
  /** First backoff delay; it doubles each time. Default 800 ms. */
  baseDelayMs?: number;
  /** Test seams. */
  isOnline?: () => boolean;
  waitForOnline?: () => Promise<void>;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Runs `load` until it succeeds. While the browser is offline it waits for the `online` event
 * (no attempt is spent), and while online it retries `retries` times with doubling delays, then
 * rejects with the last error.
 */
export async function importWithRetry<T>(
  load: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    retries = 3,
    baseDelayMs = 800,
    isOnline: online = isOnline,
    waitForOnline: untilOnline = waitForOnline,
    sleep = defaultSleep,
  } = options;
  let failures = 0;
  for (;;) {
    try {
      return await load();
    } catch (error) {
      if (!online()) {
        await untilOnline();
        continue;
      }
      if (failures >= retries) throw error;
      await sleep(baseDelayMs * 2 ** failures);
      failures += 1;
    }
  }
}

/** Renders nothing: what a decorative lazy component becomes when its chunk never arrives. */
function Nothing(): null {
  return null;
}

/**
 * `lazy()` with `importWithRetry`. `silent` is for decoration (WebGL effects, charts' extras):
 * when the chunk cannot be loaded it resolves to a component that renders nothing, so the
 * Suspense fallback or poster stays and nothing throws.
 */
export function lazyWithRetry<P extends object>(
  load: () => Promise<{ default: ComponentType<P> }>,
  { silent = false, ...options }: RetryOptions & { silent?: boolean } = {},
): LazyExoticComponent<ComponentType<P>> {
  return lazy(async () => {
    try {
      return await importWithRetry(load, options);
    } catch (error) {
      if (!silent) throw error;
      return { default: Nothing as ComponentType<P> };
    }
  });
}
