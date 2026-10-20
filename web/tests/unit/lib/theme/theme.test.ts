import { describe, expect, it, vi } from 'vitest';

import {
  applyThemePreference,
  readThemePreference,
  setThemePreference,
  subscribeThemePreference,
  THEME_SCRIPT,
  THEME_STORAGE_KEY,
} from '@/lib/theme/theme';

const root = () => document.documentElement;

function runThemeScript() {
  // The script runs inline in <head>; here it runs against jsdom's document.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- the fixed inline script under test
  const script = new Function(THEME_SCRIPT) as () => void;
  script();
}

describe('theme script (runs before the first paint)', () => {
  it('applies a stored explicit choice', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    runThemeScript();
    expect(root().getAttribute('data-theme')).toBe('light');

    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    runThemeScript();
    expect(root().getAttribute('data-theme')).toBe('dark');
  });

  it('leaves the attribute off for "system", nothing stored or junk', () => {
    for (const stored of ['system', null, 'purple', '"light"']) {
      root().removeAttribute('data-theme');
      if (stored === null) window.localStorage.removeItem(THEME_STORAGE_KEY);
      else window.localStorage.setItem(THEME_STORAGE_KEY, stored);
      runThemeScript();
      expect(root().hasAttribute('data-theme'), String(stored)).toBe(false);
    }
  });

  it('does not throw when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(runThemeScript).not.toThrow();
    expect(root().hasAttribute('data-theme')).toBe(false);
  });

  it('reads the storage key used by the rest of the app', () => {
    expect(THEME_SCRIPT).toContain(JSON.stringify(THEME_STORAGE_KEY));
    expect(THEME_STORAGE_KEY).toBe('dm.theme');
  });
});

describe('theme preference store', () => {
  it('defaults to system, and ignores unknown values', () => {
    expect(readThemePreference()).toBe('system');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
    expect(readThemePreference()).toBe('system');
  });

  it('stores, applies and announces a choice', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeThemePreference(listener);

    setThemePreference('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(root().getAttribute('data-theme')).toBe('light');
    expect(readThemePreference()).toBe('light');

    setThemePreference('system');
    expect(root().hasAttribute('data-theme')).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    setThemePreference('dark');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('follows a change made in another tab', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeThemePreference(listener);

    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    window.dispatchEvent(new StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: 'dark' }));
    expect(root().getAttribute('data-theme')).toBe('dark');
    expect(listener).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new StorageEvent('storage', { key: 'something-else' }));
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('keeps working when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'QuotaExceededError');
    });
    expect(() => setThemePreference('light')).not.toThrow();
    expect(root().getAttribute('data-theme')).toBe('light');
  });

  it('applyThemePreference writes the attribute the CSS reads', () => {
    applyThemePreference('dark');
    expect(root().dataset.theme).toBe('dark');
    applyThemePreference('system');
    expect(root().dataset.theme).toBeUndefined();
  });
});
