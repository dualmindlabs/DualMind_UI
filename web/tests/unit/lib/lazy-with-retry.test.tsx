import { render, screen, waitFor } from '@testing-library/react';
import { type ComponentType, Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { importWithRetry, lazyWithRetry } from '@/lib/lazy-with-retry';

import { setNavigatorOnline } from './network/navigator-online';

const chunkError = () => new TypeError('Failed to fetch dynamically imported module: /a.js');

describe('importWithRetry', () => {
  it('returns the module at once when the import works', async () => {
    const load = vi.fn(() => Promise.resolve('module'));
    await expect(importWithRetry(load)).resolves.toBe('module');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('retries with doubling delays while online, then rejects with the last error', async () => {
    const load = vi.fn(() => Promise.reject(chunkError()));
    const sleep = vi.fn(() => Promise.resolve());
    await expect(
      importWithRetry(load, { retries: 2, baseDelayMs: 100, isOnline: () => true, sleep }),
    ).rejects.toThrow('dynamically imported');
    expect(load).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[100], [200]]);
  });

  it('recovers when a retry succeeds', async () => {
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(chunkError())
      .mockResolvedValueOnce('module');
    await expect(
      importWithRetry(load, { isOnline: () => true, sleep: () => Promise.resolve() }),
    ).resolves.toBe('module');
  });

  it('waits for the online event while offline, without spending attempts', async () => {
    let online = false;
    let resume: () => void = () => {};
    const waitForOnline = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resume = () => {
            online = true;
            resolve();
          };
        }),
    );
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(chunkError())
      .mockRejectedValueOnce(chunkError())
      .mockResolvedValueOnce('module');
    const sleep = vi.fn(() => Promise.resolve());
    const result = importWithRetry(load, {
      retries: 0,
      isOnline: () => online,
      waitForOnline,
      sleep,
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(load).toHaveBeenCalledTimes(1);
    expect(waitForOnline).toHaveBeenCalledTimes(1);
    resume();
    // The second failure happens online with no retries left (the browser said online again).
    await expect(result).rejects.toThrow();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('uses the real online event by default', async () => {
    const restore = setNavigatorOnline(false);
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(chunkError())
      .mockResolvedValueOnce('module');
    const result = importWithRetry(load);
    await Promise.resolve();
    await Promise.resolve();
    expect(load).toHaveBeenCalledTimes(1);
    setNavigatorOnline(true);
    window.dispatchEvent(new Event('online'));
    await expect(result).resolves.toBe('module');
    restore();
  });
});

describe('lazyWithRetry', () => {
  function Hello() {
    return <p>hello</p>;
  }

  it('renders the component once the chunk loads', async () => {
    const Lazy = lazyWithRetry(() => Promise.resolve({ default: Hello }));
    render(
      <Suspense fallback={<p>loading</p>}>
        <Lazy />
      </Suspense>,
    );
    expect(await screen.findByText('hello')).toBeInTheDocument();
  });

  it('a silent component renders nothing when the chunk never arrives', async () => {
    const Lazy = lazyWithRetry<ComponentType>(() => Promise.reject(chunkError()), {
      silent: true,
      retries: 0,
      isOnline: () => true,
    });
    const { container } = render(
      <Suspense fallback={<p>loading</p>}>
        <Lazy />
      </Suspense>,
    );
    await waitFor(() => expect(screen.queryByText('loading')).not.toBeInTheDocument());
    expect(container).toBeEmptyDOMElement();
  });
});
