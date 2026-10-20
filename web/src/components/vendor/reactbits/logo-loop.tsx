/**
 * Logo Loop, from React Bits by David Haz.
 * Source: https://reactbits.dev/r/LogoLoop-TS-TW.json (copied 2026-10-20)
 * Licence: MIT + Commons Clause (see ./LICENSE.md). Used as part of this website only.
 * Our changes:
 * - Rewritten down to the horizontal line layout: a requestAnimationFrame loop moves one track
 *   with `translate3d` and eases its speed to a stop on hover, on keyboard focus, off-screen, in
 *   hidden tabs, while `paused` (the caller's visible pause control, WCAG 2.2.2) and under
 *   reduced motion (useShouldReduceMotion).
 * - Accessible structure: the first copy is a real labelled list; the copies that make the loop
 *   seamless are hidden from assistive technology and their links leave the tab order.
 * - Edge fade with a mask instead of a colour overlay, so it works on any surface and theme.
 * - Removed the wave, arc and orbit layouts, vertical directions, tilt, focus magnification,
 *   labels, dragging, scroll boost and intro. Named export.
 */
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';

import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

export interface LogoItem {
  /** The logo itself (an SVG or an image); make it decorative, the label names it. */
  node: ReactNode;
  /** Accessible name, such as the provider's name. */
  label: string;
  href?: string;
}

export interface LogoLoopProps {
  logos: LogoItem[];
  /** Accessible name of the list. */
  ariaLabel: string;
  /** Pixels per second; negative values move to the right. */
  speed?: number;
  /** Space between logos, in pixels. */
  gap?: number;
  /** Logo height, in pixels. */
  logoHeight?: number;
  pauseOnHover?: boolean;
  /** Fade the left and right edges. */
  fadeOut?: boolean;
  /** Stop the loop (bind it to a visible pause button). */
  paused?: boolean;
  className?: string;
}

const SMOOTH_TAU = 0.25;

function LogoList({
  logos,
  hidden,
  gap,
  logoHeight,
  ariaLabel,
}: {
  logos: LogoItem[];
  hidden: boolean;
  gap: number;
  logoHeight: number;
  ariaLabel?: string;
}) {
  return (
    <ul
      aria-label={hidden ? undefined : ariaLabel}
      aria-hidden={hidden || undefined}
      className="flex shrink-0 items-center"
      style={{ gap, paddingRight: gap }}
    >
      {logos.map(logo => (
        <li
          key={logo.label}
          className="flex shrink-0 items-center text-muted"
          style={{ height: logoHeight }}
        >
          {logo.href ? (
            <a
              href={logo.href}
              aria-label={logo.label}
              tabIndex={hidden ? -1 : undefined}
              className="inline-flex h-full items-center rounded-sm transition-colors duration-(--dur-fast) hover:text-fg"
            >
              {logo.node}
            </a>
          ) : (
            <span role="img" aria-label={logo.label} className="inline-flex h-full items-center">
              {logo.node}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** A row of logos that loops forever: the model providers strip. */
export function LogoLoop({
  logos,
  ariaLabel,
  speed = 40,
  gap = 48,
  logoHeight = 28,
  pauseOnHover = true,
  fadeOut = true,
  paused = false,
  className,
}: LogoLoopProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduce = useShouldReduceMotion();
  const [copies, setCopies] = useState(2);
  const stopped = paused || reduce;
  const settingsRef = useRef({ speed, pauseOnHover, stopped });
  const wakeLoop = useRef<(() => void) | null>(null);

  useEffect(() => {
    settingsRef.current = { speed, pauseOnHover, stopped };
  });

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track) return undefined;

    const state = { offset: 0, velocity: 0, period: 0, hovered: false, focused: false };
    let visible = true;
    let raf = 0;
    let last = 0;

    const measure = () => {
      const list = track.firstElementChild;
      if (!(list instanceof HTMLElement)) return;
      state.period = list.offsetWidth;
      const needed = state.period > 0 ? Math.ceil(root.offsetWidth / state.period) + 1 : 2;
      setCopies(Math.max(2, Math.min(needed, 12)));
    };

    const frame = (now: number) => {
      raf = 0;
      const s = settingsRef.current;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      const halted =
        s.stopped || !visible || document.hidden || state.focused || (s.pauseOnHover && state.hovered);
      const goal = halted ? 0 : s.speed;
      state.velocity += (goal - state.velocity) * (1 - Math.exp(-dt / SMOOTH_TAU));
      if (Math.abs(goal - state.velocity) < 0.05) state.velocity = goal;
      if (state.period > 0) {
        state.offset = (((state.offset + state.velocity * dt) % state.period) + state.period) % state.period;
      }
      track.style.transform = `translate3d(${(-state.offset).toFixed(2)}px, 0, 0)`;
      if (state.velocity !== 0 || goal !== 0) raf = requestAnimationFrame(frame);
      else last = 0;
    };

    const wake = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const onEnter = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') state.hovered = true;
      wake();
    };
    const onLeave = () => {
      state.hovered = false;
      wake();
    };
    const onFocusIn = () => {
      state.focused = true;
      // Bring the focused (first) copy back into view.
      state.offset = 0;
      state.velocity = 0;
      track.style.transform = '';
      wake();
    };
    const onFocusOut = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) return;
      state.focused = false;
      wake();
    };
    const onVisibility = () => wake();

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            measure();
            wake();
          });
    resizeObserver?.observe(root);
    const intersection =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(entries => {
            visible = entries.some(entry => entry.isIntersecting);
            wake();
          });
    intersection?.observe(root);
    root.addEventListener('pointerenter', onEnter);
    root.addEventListener('pointerleave', onLeave);
    root.addEventListener('focusin', onFocusIn);
    root.addEventListener('focusout', onFocusOut);
    document.addEventListener('visibilitychange', onVisibility);
    wakeLoop.current = wake;
    wake();

    return () => {
      cancelAnimationFrame(raf);
      wakeLoop.current = null;
      resizeObserver?.disconnect();
      intersection?.disconnect();
      root.removeEventListener('pointerenter', onEnter);
      root.removeEventListener('pointerleave', onLeave);
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    wakeLoop.current?.();
  }, [stopped, speed]);

  const mask = fadeOut
    ? ({
        maskImage: 'linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)',
      } satisfies CSSProperties)
    : undefined;

  return (
    <div ref={rootRef} className={cn('relative overflow-hidden', className)} style={mask}>
      <div ref={trackRef} className="flex w-max will-change-transform">
        {Array.from({ length: copies }, (_, copy) => (
          <LogoList
            key={copy}
            logos={logos}
            hidden={copy > 0}
            gap={gap}
            logoHeight={logoHeight}
            ariaLabel={ariaLabel}
          />
        ))}
      </div>
    </div>
  );
}
