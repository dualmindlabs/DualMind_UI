/**
 * Magnet, from React Bits by David Haz.
 * Source: https://reactbits.dev/r/Magnet-TS-TW.json (copied 2026-10-20)
 * Licence: MIT + Commons Clause (see ./LICENSE.md). Used as part of this website only.
 * Our changes:
 * - Only for a fine pointer that can hover (desktop); touch, pen taps and keyboard use leave the
 *   child where it is. Off under reduced motion (useShouldReduceMotion).
 * - Each instance listens on its own, while the pointer is near it; the loop sleeps at rest.
 * - Kept the padding, strength, maximum offset and the spring; removed exclusive arbitration
 *   between magnets, axis locks, tilt, scale and the active callback. Named export.
 */
import { type ReactNode, useEffect, useRef } from 'react';

import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

export interface MagnetProps {
  children: ReactNode;
  className?: string;
  /** How far outside the element the pull starts, in pixels. */
  padding?: number;
  /** Higher is weaker: the offset is the pointer distance divided by this. */
  strength?: number;
  /** Largest offset, in pixels. */
  maxOffset?: number;
  disabled?: boolean;
}

const STIFFNESS = 170;
const DAMPING = 16;
const FINE_POINTER = '(hover: hover) and (pointer: fine)';

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** Pulls its child towards the pointer when the pointer comes close: the closing CTA button. */
export function Magnet({
  children,
  className,
  padding = 80,
  strength = 3,
  maxOffset = 14,
  disabled = false,
}: MagnetProps) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const reduce = useShouldReduceMotion();
  const off = disabled || reduce;
  const settingsRef = useRef({ padding, strength, maxOffset });

  useEffect(() => {
    settingsRef.current = { padding, strength, maxOffset };
  });

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    if (off || !wrapper || !inner) return undefined;
    if (typeof window.matchMedia !== 'function' || !window.matchMedia(FINE_POINTER).matches) {
      return undefined;
    }

    const current = { x: 0, y: 0 };
    const velocity = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    let raf = 0;
    let last = 0;

    const apply = () => {
      inner.style.transform =
        Math.abs(current.x) < 0.01 && Math.abs(current.y) < 0.01
          ? ''
          : `translate3d(${current.x.toFixed(2)}px, ${current.y.toFixed(2)}px, 0)`;
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      let resting = true;
      const steps = Math.ceil(dt / (1 / 120));
      for (let step = 0; step < steps; step++) {
        const h = dt / steps;
        for (const axis of ['x', 'y'] as const) {
          const force = STIFFNESS * (target[axis] - current[axis]) - DAMPING * velocity[axis];
          velocity[axis] += force * h;
          current[axis] += velocity[axis] * h;
        }
      }
      for (const axis of ['x', 'y'] as const) {
        if (Math.abs(target[axis] - current[axis]) > 0.05 || Math.abs(velocity[axis]) > 0.05) {
          resting = false;
        }
      }
      if (resting) {
        current.x = target.x;
        current.y = target.y;
        velocity.x = 0;
        velocity.y = 0;
      }
      apply();
      if (resting) last = 0;
      else raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const s = settingsRef.current;
      const rect = wrapper.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const outside = Math.hypot(
        Math.max(0, Math.abs(dx) - rect.width / 2),
        Math.max(0, Math.abs(dy) - rect.height / 2),
      );
      if (outside > s.padding) {
        if (target.x !== 0 || target.y !== 0) {
          target.x = 0;
          target.y = 0;
          wake();
        }
        return;
      }
      const pull = s.padding > 0 ? 1 - smoothstep(s.padding * 0.5, s.padding, outside) : 1;
      let x = (dx / s.strength) * pull;
      let y = (dy / s.strength) * pull;
      const length = Math.hypot(x, y);
      if (length > s.maxOffset) {
        x *= s.maxOffset / length;
        y *= s.maxOffset / length;
      }
      target.x = x;
      target.y = y;
      wake();
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
      wake();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      inner.style.transform = '';
    };
  }, [off]);

  return (
    <span ref={wrapperRef} className={cn('relative inline-block', className)}>
      <span ref={innerRef} className="inline-block will-change-transform">
        {children}
      </span>
    </span>
  );
}
