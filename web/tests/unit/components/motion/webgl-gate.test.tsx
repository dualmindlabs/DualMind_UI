import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ReducedMotionScope } from '@/components/motion/reduced-motion-scope';
import { type WebGLEffectProps, WebGLGate } from '@/components/motion/webgl-gate';
import { resetWebGL2Support } from '@/lib/motion/webgl-policy';

const originalMatchMedia: unknown = Reflect.get(window, 'matchMedia');
const originalObserver: unknown = Reflect.get(window, 'IntersectionObserver');

function define(target: object, key: string, value: unknown) {
  Object.defineProperty(target, key, { configurable: true, writable: true, value });
}

/** matchMedia that matches the listed queries; `set` flips one and notifies listeners. */
function mockMatchMedia(matching: string[] = []) {
  const active = new Set(matching);
  const listeners = new Map<string, Set<() => void>>();
  define(window, 'matchMedia', (query: string) => ({
    get matches() {
      return active.has(query);
    },
    media: query,
    addEventListener: (_type: string, listener: () => void) => {
      if (!listeners.has(query)) listeners.set(query, new Set());
      listeners.get(query)?.add(listener);
    },
    removeEventListener: (_type: string, listener: () => void) =>
      listeners.get(query)?.delete(listener),
  }));
  return {
    set(query: string, on: boolean) {
      if (on) active.add(query);
      else active.delete(query);
      listeners.get(query)?.forEach(listener => listener());
    },
  };
}

/** An IntersectionObserver whose entries the test controls. */
function mockIntersectionObserver() {
  const observers: { callback: IntersectionObserverCallback; elements: Element[] }[] = [];
  class FakeObserver {
    callback: IntersectionObserverCallback;
    elements: Element[] = [];
    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
      observers.push(this);
    }
    observe(element: Element) {
      this.elements.push(element);
    }
    disconnect() {
      this.elements = [];
    }
    unobserve() {}
    takeRecords() {
      return [];
    }
  }
  define(window, 'IntersectionObserver', FakeObserver);
  return {
    /** Reports every observed element as in (or out of) view. */
    report(isIntersecting: boolean) {
      act(() => {
        for (const observer of observers) {
          const entries = observer.elements.map(
            target => ({ isIntersecting, target }) as IntersectionObserverEntry,
          );
          if (entries.length) observer.callback(entries, observer as unknown as IntersectionObserver);
        }
      });
    },
  };
}

function setDeviceMemory(value: number | undefined) {
  define(navigator, 'deviceMemory', value);
}

function setWebGL2(available: boolean) {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    available ? ({ getExtension: () => null } as unknown as RenderingContext) : null,
  );
}

const REDUCED = '(prefers-reduced-motion: reduce)';

function renderGate(effect = vi.fn((props: WebGLEffectProps) => (
  <div data-testid="effect" data-paused={String(props.paused)} data-dpr={props.maxDpr} />
))) {
  const view = render(
    <WebGLGate poster={<div data-testid="poster" />}>{effect}</WebGLGate>,
  );
  const gate = view.container.firstElementChild as HTMLElement;
  return { ...view, gate, effect };
}

beforeEach(() => {
  resetWebGL2Support();
  setDeviceMemory(8);
  setWebGL2(true);
});

afterEach(() => {
  define(window, 'matchMedia', originalMatchMedia);
  define(window, 'IntersectionObserver', originalObserver);
  setDeviceMemory(undefined);
});

describe('WebGLGate', () => {
  it('runs the effect on a capable device once it is near the viewport', () => {
    mockMatchMedia();
    const io = mockIntersectionObserver();
    const { gate } = renderGate();

    expect(gate).toHaveAttribute('data-webgl', 'pending');
    expect(screen.getByTestId('poster')).toBeInTheDocument();
    expect(screen.queryByTestId('effect')).toBeNull();

    io.report(true);
    expect(gate).toHaveAttribute('data-webgl', 'live');
    expect(screen.getByTestId('effect')).toHaveAttribute('data-paused', 'false');
    expect(screen.getByTestId('effect')).toHaveAttribute('data-dpr', '1.5');
    // The poster stays underneath, and the whole gate is decorative.
    expect(screen.getByTestId('poster')).toBeInTheDocument();
    expect(gate).toHaveAttribute('aria-hidden', 'true');
  });

  it('pauses the effect off-screen and in a hidden tab', () => {
    mockMatchMedia();
    const io = mockIntersectionObserver();
    renderGate();
    io.report(true);
    io.report(false);
    expect(screen.getByTestId('effect')).toHaveAttribute('data-paused', 'true');

    io.report(true);
    expect(screen.getByTestId('effect')).toHaveAttribute('data-paused', 'false');
    define(document, 'visibilityState', 'hidden');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(screen.getByTestId('effect')).toHaveAttribute('data-paused', 'true');
    define(document, 'visibilityState', 'visible');
  });

  it.each([
    ['reduced-motion', () => mockMatchMedia([REDUCED])],
    ['small-touch-screen', () => mockMatchMedia(['(pointer: coarse) and (max-width: 820px)'])],
    ['save-data', () => mockMatchMedia(['(prefers-reduced-data: reduce)'])],
    [
      'low-memory',
      () => {
        mockMatchMedia();
        setDeviceMemory(2);
      },
    ],
    [
      'no-webgl2',
      () => {
        mockMatchMedia();
        setWebGL2(false);
      },
    ],
  ])('keeps the static poster for %s', (reason, setup) => {
    setup();
    const io = mockIntersectionObserver();
    const { gate, effect } = renderGate();
    io.report(true);
    expect(gate).toHaveAttribute('data-webgl', 'static');
    expect(gate).toHaveAttribute('data-webgl-reason', reason);
    expect(screen.getByTestId('poster')).toBeInTheDocument();
    expect(effect).not.toHaveBeenCalled();
  });

  it('follows reduced motion live: the effect unmounts and comes back', () => {
    const media = mockMatchMedia();
    const io = mockIntersectionObserver();
    const { gate } = renderGate();
    io.report(true);
    expect(gate).toHaveAttribute('data-webgl', 'live');

    act(() => media.set(REDUCED, true));
    expect(gate).toHaveAttribute('data-webgl', 'static');
    expect(screen.queryByTestId('effect')).toBeNull();

    act(() => media.set(REDUCED, false));
    expect(gate).toHaveAttribute('data-webgl', 'live');
  });

  it('shows the poster inside a ReducedMotionScope', () => {
    mockMatchMedia();
    const io = mockIntersectionObserver();
    render(
      <ReducedMotionScope reduce>
        <WebGLGate poster={<div data-testid="poster" />}>{() => <div data-testid="effect" />}</WebGLGate>
      </ReducedMotionScope>,
    );
    io.report(true);
    expect(screen.queryByTestId('effect')).toBeNull();
    expect(document.querySelector('[data-webgl]')).toHaveAttribute(
      'data-webgl-reason',
      'reduced-motion',
    );
  });
});
