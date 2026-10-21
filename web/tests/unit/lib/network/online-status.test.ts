import { afterEach, describe, expect, it, vi } from 'vitest';

import { isOnline, subscribeOnline, waitForOnline } from '@/lib/network/online-status';

import { setNavigatorOnline } from './navigator-online';

afterEach(() => vi.restoreAllMocks());

describe('online status', () => {
  it('follows navigator.onLine', () => {
    const restore = setNavigatorOnline(false);
    expect(isOnline()).toBe(false);
    setNavigatorOnline(true);
    expect(isOnline()).toBe(true);
    restore();
  });

  it('notifies on online and offline events until unsubscribed', () => {
    const listener = vi.fn();
    const stop = subscribeOnline(listener);
    window.dispatchEvent(new Event('offline'));
    window.dispatchEvent(new Event('online'));
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
    window.dispatchEvent(new Event('online'));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('waitForOnline resolves at once online and at the event offline', async () => {
    const restore = setNavigatorOnline(true);
    await expect(waitForOnline()).resolves.toBeUndefined();
    setNavigatorOnline(false);
    let done = false;
    const waiting = waitForOnline().then(() => (done = true));
    await Promise.resolve();
    expect(done).toBe(false);
    window.dispatchEvent(new Event('online'));
    await waiting;
    expect(done).toBe(true);
    restore();
  });
});
