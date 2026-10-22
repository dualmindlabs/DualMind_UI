import { describe, expect, it, vi } from 'vitest';

import {
  RELOAD_GUARD_KEY,
  RELOAD_GUARD_MS,
  reloadWhenOnline,
} from '@/lib/network/reload-when-online';

function memory(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
  };
}

describe('reloadWhenOnline', () => {
  it('reloads once at the online event and stamps the guard', () => {
    const reload = vi.fn();
    const target = new EventTarget();
    const storage = memory();
    reloadWhenOnline({ reload, storage, target, now: () => 1000 });
    target.dispatchEvent(new Event('online'));
    expect(reload).toHaveBeenCalledTimes(1);
    expect(storage.map.get(RELOAD_GUARD_KEY)).toBe('1000');
  });

  it('does not reload again within the guard window, but does after it', () => {
    const reload = vi.fn();
    const target = new EventTarget();
    let time = 5000;
    const storage = memory({ [RELOAD_GUARD_KEY]: '5000' });
    reloadWhenOnline({ reload, storage, target, now: () => time });
    target.dispatchEvent(new Event('online'));
    expect(reload).not.toHaveBeenCalled();
    time += RELOAD_GUARD_MS + 1;
    target.dispatchEvent(new Event('online'));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('stops listening when cleaned up', () => {
    const reload = vi.fn();
    const target = new EventTarget();
    const stop = reloadWhenOnline({ reload, storage: memory(), target });
    stop();
    target.dispatchEvent(new Event('online'));
    expect(reload).not.toHaveBeenCalled();
  });

  it('does not reload when storage is blocked (no guard means a possible loop)', () => {
    const reload = vi.fn();
    const target = new EventTarget();
    const storage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {},
    };
    reloadWhenOnline({ reload, storage, target });
    target.dispatchEvent(new Event('online'));
    expect(reload).not.toHaveBeenCalled();
  });
});
