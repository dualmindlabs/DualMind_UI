import { afterEach, describe, expect, it, vi } from 'vitest';

import { canShareNatively, copyText, shareNatively } from '@/lib/utils/clipboard';

function setNavigator(key: 'clipboard' | 'share' | 'canShare', value: unknown) {
  Object.defineProperty(navigator, key, { value, configurable: true, writable: true });
}

afterEach(() => {
  setNavigator('clipboard', undefined);
  setNavigator('share', undefined);
  setNavigator('canShare', undefined);
});

describe('clipboard and the share sheet', () => {
  it('copies, and reports a refused clipboard as false', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    setNavigator('clipboard', { writeText });
    expect(await copyText('https://x.test/share/1')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('https://x.test/share/1');
    setNavigator('clipboard', { writeText: () => Promise.reject(new Error('denied')) });
    expect(await copyText('x')).toBe(false);
    setNavigator('clipboard', undefined);
    expect(await copyText('x')).toBe(false);
  });

  it('knows when there is a share sheet', () => {
    expect(canShareNatively({ url: 'https://x.test' })).toBe(false);
    setNavigator('share', vi.fn());
    expect(canShareNatively({ url: 'https://x.test' })).toBe(true);
    setNavigator('canShare', () => false);
    expect(canShareNatively({ url: 'https://x.test' })).toBe(false);
  });

  it('tells a share from a closed sheet and a failure', async () => {
    expect(await shareNatively({ url: 'https://x.test' })).toBe('failed');
    const share = vi.fn(() => Promise.resolve());
    setNavigator('share', share);
    expect(await shareNatively({ url: 'https://x.test', title: 'T' })).toBe('shared');
    expect(share).toHaveBeenCalledWith({ url: 'https://x.test', title: 'T' });
    setNavigator('share', () => Promise.reject(new DOMException('closed', 'AbortError')));
    expect(await shareNatively({ url: 'https://x.test' })).toBe('cancelled');
    setNavigator('share', () => Promise.reject(new DOMException('no', 'NotAllowedError')));
    expect(await shareNatively({ url: 'https://x.test' })).toBe('failed');
  });
});
