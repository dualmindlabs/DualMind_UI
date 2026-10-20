/**
 * Spotlight Card, from React Bits by David Haz.
 * Source: https://reactbits.dev/r/SpotlightCard-TS-TW.json (copied 2026-10-20)
 * Licence: MIT + Commons Clause (see ./LICENSE.md). Used as part of this website only.
 * Our changes:
 * - The light and the rim glow are fixed radial gradients moved with `transform` (compositor
 *   only) instead of gradients rebuilt on every frame.
 * - Surface, border and light come from design tokens (`spotlightColor` takes a token).
 * - Still follows keyboard focus inside the card, like the original; reduced motion makes the
 *   light jump instead of glide; touch input is ignored.
 * - Kept the circle shape, size, intensity, rim glow and smoothing; removed the beam shape,
 *   grain, flare, ambient drift, proximity and the theme palettes. Named export.
 */
import { type ComponentProps, type CSSProperties, useEffect, useRef } from 'react';

import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

export interface SpotlightCardProps extends ComponentProps<'div'> {
  /** Light colour token. */
  spotlightColor?: `--${string}`;
  /** Strength of the light on the surface, 0 to 1. */
  intensity?: number;
  /** Radius of the light, in pixels. */
  size?: number;
  /** Strength of the light on the border, 0 to 1. */
  borderGlow?: number;
  /** 0 follows the pointer exactly, 1 glides behind it. */
  smoothing?: number;
}

const RING_MASK =
  'p-px [mask:linear-gradient(#000_0_0)_content-box_exclude,linear-gradient(#000_0_0)] [-webkit-mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] [-webkit-mask-composite:xor]';

/** A card lit by a soft spotlight that follows the pointer and keyboard focus. */
export function SpotlightCard({
  children,
  className,
  style,
  spotlightColor = '--mind-a',
  intensity = 0.14,
  size = 260,
  borderGlow = 0.7,
  smoothing = 0.3,
  ...rest
}: SpotlightCardProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLSpanElement>(null);
  const rimRef = useRef<HTMLSpanElement>(null);
  const reduce = useShouldReduceMotion();
  const settingsRef = useRef({ intensity, borderGlow, smoothing, reduce });

  useEffect(() => {
    settingsRef.current = { intensity, borderGlow, smoothing, reduce };
  });

  useEffect(() => {
    const root = rootRef.current;
    const light = lightRef.current;
    const rim = rimRef.current;
    if (!root || !light || !rim) return undefined;

    const state = { x: 0, y: 0, presence: 0, targetX: 0, targetY: 0, target: 0 };
    let focus: Element | null = null;
    let raf = 0;
    let last = 0;

    const paint = () => {
      const s = settingsRef.current;
      const transform = `translate3d(${state.x.toFixed(1)}px, ${state.y.toFixed(1)}px, 0)`;
      light.style.transform = transform;
      rim.style.setProperty('--spot-x', `${state.x.toFixed(1)}px`);
      rim.style.setProperty('--spot-y', `${state.y.toFixed(1)}px`);
      light.style.opacity = (state.presence * s.intensity).toFixed(3);
      rim.style.opacity = (state.presence * s.borderGlow).toFixed(3);
    };

    const tick = (now: number) => {
      raf = 0;
      const s = settingsRef.current;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      if (focus && root.contains(focus)) {
        const rect = root.getBoundingClientRect();
        const box = focus.getBoundingClientRect();
        state.targetX = box.left + box.width / 2 - rect.left;
        state.targetY = box.top + box.height / 2 - rect.top;
        state.target = 1;
      }
      if (state.presence < 0.02 && state.target > 0) {
        state.x = state.targetX;
        state.y = state.targetY;
      }
      const follow =
        s.reduce || s.smoothing === 0 ? 1 : 1 - Math.exp(-dt / (0.015 + s.smoothing * 0.22));
      state.x += (state.targetX - state.x) * follow;
      state.y += (state.targetY - state.y) * follow;
      const fade = s.reduce ? 1 : 1 - Math.exp(-dt / (state.target > state.presence ? 0.1 : 0.32));
      state.presence += (state.target - state.presence) * fade;
      if (Math.abs(state.target - state.presence) < 0.002) state.presence = state.target;
      paint();
      const moving =
        Math.abs(state.targetX - state.x) > 0.1 || Math.abs(state.targetY - state.y) > 0.1;
      if (moving || state.presence !== state.target) raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const rect = root.getBoundingClientRect();
      state.targetX = event.clientX - rect.left;
      state.targetY = event.clientY - rect.top;
      state.target = 1;
      wake();
    };
    const onLeave = () => {
      if (focus) return;
      state.target = 0;
      wake();
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!(event.target instanceof Element) || !event.target.matches(':focus-visible')) return;
      focus = event.target;
      wake();
    };
    const onFocusOut = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) return;
      focus = null;
      state.target = 0;
      wake();
    };

    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerleave', onLeave);
    root.addEventListener('focusin', onFocusIn);
    root.addEventListener('focusout', onFocusOut);
    paint();

    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  const lightStyle = {
    width: size * 2,
    height: size * 2,
    left: -size,
    top: -size,
    backgroundImage: `radial-gradient(closest-side, var(${spotlightColor}), color-mix(in oklab, var(${spotlightColor}) 35%, transparent) 45%, transparent)`,
  } satisfies CSSProperties;

  const rimStyle = {
    backgroundImage: `radial-gradient(${size * 0.6}px circle at var(--spot-x, 50%) var(--spot-y, 50%), var(${spotlightColor}), transparent 70%)`,
  } satisfies CSSProperties;

  return (
    <div
      ref={rootRef}
      style={style}
      className={cn(
        'relative isolate overflow-hidden rounded-lg border border-line bg-surface shadow-raise',
        className,
      )}
      {...rest}
    >
      <span
        ref={lightRef}
        aria-hidden="true"
        style={lightStyle}
        className="pointer-events-none absolute -z-10 rounded-full opacity-0 will-change-transform"
      />
      {children}
      <span
        ref={rimRef}
        aria-hidden="true"
        style={rimStyle}
        className={cn(
          'pointer-events-none absolute -inset-px z-[1] rounded-[inherit] opacity-0',
          RING_MASK,
        )}
      />
    </div>
  );
}
