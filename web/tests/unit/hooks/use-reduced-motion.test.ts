import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useReducedMotion, useSystemReducedMotion } from '@/hooks/use-reduced-motion';
import { setMotionPreference } from '@/lib/motion/motion-preference';

// Read without binding: jsdom has no matchMedia, so this is undefined.
const originalMatchMedia: unknown = Reflect.get(window, 'matchMedia');

function setMatchMedia(value: unknown) {
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value });
}

/** A controllable stand-in for window.matchMedia (jsdom has none). */
function mockMatchMedia(initial: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches: initial,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  };
  setMatchMedia(() => query);
  return {
    listeners,
    set(matches: boolean) {
      query.matches = matches;
      listeners.forEach(listener => listener());
    },
  };
}

afterEach(() => {
  setMatchMedia(originalMatchMedia);
  document.documentElement.removeAttribute('data-motion');
});

describe('useReducedMotion', () => {
  it('is false when matchMedia is unavailable', () => {
    setMatchMedia(undefined);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('reads the current setting', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('follows changes while mounted and unsubscribes on unmount', () => {
    const media = mockMatchMedia(false);
    const { result, unmount } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    act(() => media.set(true));
    expect(result.current).toBe(true);

    act(() => media.set(false));
    expect(result.current).toBe(false);

    unmount();
    expect(media.listeners.size).toBe(0);
  });

  it('follows the motion setting on /settings/ over the OS, live', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    const system = renderHook(() => useSystemReducedMotion());
    expect(result.current).toBe(false);

    act(() => setMotionPreference('reduce'));
    expect(result.current).toBe(true);
    expect(system.result.current).toBe(false);

    act(() => setMotionPreference('system'));
    expect(result.current).toBe(false);
  });

  it('"allow" keeps motion on when the OS asks for less', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
    act(() => setMotionPreference('allow'));
    expect(result.current).toBe(false);
    act(() => setMotionPreference('system'));
    expect(result.current).toBe(true);
  });
});
