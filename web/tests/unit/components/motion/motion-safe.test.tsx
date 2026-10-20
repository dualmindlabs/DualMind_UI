import { act, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MotionSafe } from '@/components/motion/motion-safe';
import { ReducedMotionScope } from '@/components/motion/reduced-motion-scope';

const originalMatchMedia: unknown = Reflect.get(window, 'matchMedia');

function setMatchMedia(value: unknown) {
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value });
}

function mockReducedMotion(initial: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches: initial,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  };
  setMatchMedia(() => query);
  return {
    set(matches: boolean) {
      query.matches = matches;
      listeners.forEach(listener => listener());
    },
  };
}

/** Counts its mounts, like an effect that reads the media query once when it mounts. */
function Effect({ onMount }: { onMount: () => void }) {
  useEffect(() => {
    onMount();
  }, [onMount]);
  return <p>moving</p>;
}

afterEach(() => {
  setMatchMedia(originalMatchMedia);
});

describe('MotionSafe', () => {
  it('remounts its children when reduced motion flips', () => {
    const media = mockReducedMotion(false);
    const onMount = vi.fn();
    render(
      <MotionSafe>
        <Effect onMount={onMount} />
      </MotionSafe>,
    );
    expect(onMount).toHaveBeenCalledTimes(1);

    act(() => media.set(true));
    expect(onMount).toHaveBeenCalledTimes(2);
    expect(screen.getByText('moving')).toBeInTheDocument();

    act(() => media.set(false));
    expect(onMount).toHaveBeenCalledTimes(3);
  });

  it('does not remount when nothing changes', () => {
    mockReducedMotion(false);
    const onMount = vi.fn();
    const { rerender } = render(
      <MotionSafe>
        <Effect onMount={onMount} />
      </MotionSafe>,
    );
    rerender(
      <MotionSafe>
        <Effect onMount={onMount} />
      </MotionSafe>,
    );
    expect(onMount).toHaveBeenCalledTimes(1);
  });

  it('swaps in the still version while motion is reduced', () => {
    const media = mockReducedMotion(false);
    const onMount = vi.fn();
    render(
      <MotionSafe still={<p>still</p>}>
        <Effect onMount={onMount} />
      </MotionSafe>,
    );
    expect(screen.getByText('moving')).toBeInTheDocument();

    act(() => media.set(true));
    expect(screen.getByText('still')).toBeInTheDocument();
    expect(screen.queryByText('moving')).toBeNull();

    act(() => media.set(false));
    expect(screen.getByText('moving')).toBeInTheDocument();
    expect(onMount).toHaveBeenCalledTimes(2);
  });

  it('follows a ReducedMotionScope as well as the system setting', () => {
    mockReducedMotion(false);
    const { rerender } = render(
      <ReducedMotionScope reduce={false}>
        <MotionSafe still={<p>still</p>}>
          <p>moving</p>
        </MotionSafe>
      </ReducedMotionScope>,
    );
    expect(screen.getByText('moving')).toBeInTheDocument();

    rerender(
      <ReducedMotionScope reduce>
        <MotionSafe still={<p>still</p>}>
          <p>moving</p>
        </MotionSafe>
      </ReducedMotionScope>,
    );
    expect(screen.getByText('still')).toBeInTheDocument();
    expect(document.querySelector('[data-reduced-motion="true"]')).not.toBeNull();
  });
});
