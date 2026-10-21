import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  applyMotionPreference,
  isMotionPreference,
  MOTION_SCRIPT,
  MOTION_STORAGE_KEY,
  motionConfigValue,
  readMotionPreference,
  resolveReducedMotion,
  setMotionPreference,
  subscribeMotionPreference,
} from '@/lib/motion/motion-preference';

// Slice S12: the motion override on /settings/ (system, reduce, allow), stored in localStorage
// and written to <html data-motion> before the first paint.

const root = () => document.documentElement;

afterEach(() => {
  root().removeAttribute('data-motion');
});

describe('motion preference', () => {
  it('knows its three values', () => {
    expect(['system', 'reduce', 'allow'].every(isMotionPreference)).toBe(true);
    expect(isMotionPreference('fast')).toBe(false);
    expect(isMotionPreference(null)).toBe(false);
  });

  it('reads "system" when nothing (or junk) is stored', () => {
    expect(readMotionPreference()).toBe('system');
    window.localStorage.setItem(MOTION_STORAGE_KEY, 'sideways');
    expect(readMotionPreference()).toBe('system');
  });

  it('stores a choice, applies it to <html> and tells subscribers', () => {
    const listener = vi.fn();
    const stop = subscribeMotionPreference(listener);
    setMotionPreference('reduce');
    expect(window.localStorage.getItem(MOTION_STORAGE_KEY)).toBe('reduce');
    expect(root().getAttribute('data-motion')).toBe('reduce');
    expect(readMotionPreference()).toBe('reduce');
    setMotionPreference('allow');
    expect(root().getAttribute('data-motion')).toBe('allow');
    setMotionPreference('system');
    expect(window.localStorage.getItem(MOTION_STORAGE_KEY)).toBeNull();
    expect(root().hasAttribute('data-motion')).toBe(false);
    expect(listener).toHaveBeenCalledTimes(3);
    stop();
    setMotionPreference('reduce');
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('follows a change made in another tab', () => {
    const listener = vi.fn();
    const stop = subscribeMotionPreference(listener);
    window.localStorage.setItem(MOTION_STORAGE_KEY, 'reduce');
    window.dispatchEvent(new StorageEvent('storage', { key: MOTION_STORAGE_KEY }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(root().getAttribute('data-motion')).toBe('reduce');
    window.dispatchEvent(new StorageEvent('storage', { key: 'dm.theme' }));
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
  });

  it('applies before the first paint with the inline script', () => {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval -- the fixed inline script under test
    const script = new Function(MOTION_SCRIPT) as () => void;
    window.localStorage.setItem(MOTION_STORAGE_KEY, 'allow');
    script();
    expect(root().getAttribute('data-motion')).toBe('allow');
    root().removeAttribute('data-motion');
    for (const stored of ['system', 'junk', null]) {
      if (stored === null) window.localStorage.removeItem(MOTION_STORAGE_KEY);
      else window.localStorage.setItem(MOTION_STORAGE_KEY, stored);
      script();
      expect(root().hasAttribute('data-motion'), String(stored)).toBe(false);
    }
  });

  it('lets the override win over the OS, and maps it for Motion', () => {
    expect(resolveReducedMotion('system', true)).toBe(true);
    expect(resolveReducedMotion('system', false)).toBe(false);
    expect(resolveReducedMotion('reduce', false)).toBe(true);
    expect(resolveReducedMotion('allow', true)).toBe(false);
    expect(motionConfigValue('system')).toBe('user');
    expect(motionConfigValue('reduce')).toBe('always');
    expect(motionConfigValue('allow')).toBe('never');
  });

  it('applies "system" by removing the attribute', () => {
    root().setAttribute('data-motion', 'reduce');
    applyMotionPreference('system');
    expect(root().hasAttribute('data-motion')).toBe(false);
  });
});
