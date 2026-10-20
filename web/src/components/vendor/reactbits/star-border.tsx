/**
 * Star Border, from React Bits by David Haz.
 * Source: https://reactbits.dev/r/StarBorder-TS-TW.json (copied 2026-10-20)
 * Licence: MIT + Commons Clause (see ./LICENSE.md). Used as part of this website only.
 * Our changes:
 * - A decorative frame around its child (the real button or link keeps its own semantics and
 *   focus ring) instead of a polymorphic button.
 * - Colours are design tokens and follow theme changes; the light theme draws with normal
 *   blending instead of `lighter`.
 * - Reduced motion parks the star (a still highlight); the loop also stops off-screen and in
 *   hidden tabs, and the canvas pixel ratio is capped at 1.5.
 * - Kept the travelling stars, trail, glow and the extra lap on hover and keyboard focus;
 *   removed sparkle dust, click pulses, the brighten and reveal hover modes and the theme
 *   palettes. Named export.
 */
import { type ReactNode, useEffect, useRef } from 'react';

import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';
import { isLightScheme, readCssColor, type Rgb, subscribeColorScheme } from '@/lib/utils/css-color';

export interface StarBorderProps {
  children: ReactNode;
  className?: string;
  /** Star colour token. */
  color?: `--${string}`;
  /** Trail colour token (defaults to the star colour). */
  trailColor?: `--${string}`;
  /** Seconds per lap. */
  duration?: number;
  /** Border width, in pixels. */
  thickness?: number;
  /** Corner radius, in pixels; match the child's. */
  radius?: number;
  /** Trail length as a share of a lap, 0 to 1. */
  trailLength?: number;
  stars?: number;
  /** 0 to 1. */
  glow?: number;
}

interface Segment {
  length: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  angle: number | null;
}

interface Shape {
  r: number;
  segments: Segment[];
  total: number;
}

const BLEED = 40;
const LAP = 0.9;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const wrap = (value: number, total: number) => ((value % total) + total) % total;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (2 - 2 * t) ** 3 / 2);
const rgba = (rgb: Rgb, alpha: number) =>
  `rgba(${Math.round(rgb[0] * 255)}, ${Math.round(rgb[1] * 255)}, ${Math.round(rgb[2] * 255)}, ${clamp(alpha, 0, 1).toFixed(3)})`;

function outline(width: number, height: number, radius: number): Shape {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const arc = (Math.PI * r) / 2;
  const across = Math.max(0, width - 2 * r);
  const down = Math.max(0, height - 2 * r);
  const segments: Segment[] = [
    { length: across, x: r, y: 0, dx: 1, dy: 0, angle: null },
    { length: arc, x: width - r, y: r, dx: 0, dy: 0, angle: -Math.PI / 2 },
    { length: down, x: width, y: r, dx: 0, dy: 1, angle: null },
    { length: arc, x: width - r, y: height - r, dx: 0, dy: 0, angle: 0 },
    { length: across, x: width - r, y: height, dx: -1, dy: 0, angle: null },
    { length: arc, x: r, y: height - r, dx: 0, dy: 0, angle: Math.PI / 2 },
    { length: down, x: 0, y: height - r, dx: 0, dy: -1, angle: null },
    { length: arc, x: r, y: r, dx: 0, dy: 0, angle: Math.PI },
  ];
  return { r, segments, total: Math.max(1, segments.reduce((sum, item) => sum + item.length, 0)) };
}

function pointAt(shape: Shape, distance: number): [number, number] {
  let s = wrap(distance, shape.total);
  for (const segment of shape.segments) {
    if (segment.length > 0 && s <= segment.length) {
      if (segment.angle === null) return [segment.x + segment.dx * s, segment.y + segment.dy * s];
      const angle = segment.angle + s / shape.r;
      return [segment.x + Math.cos(angle) * shape.r, segment.y + Math.sin(angle) * shape.r];
    }
    s -= segment.length;
  }
  return [0, 0];
}

/** A star that travels around the border of its child: the closing call to action. */
export function StarBorder({
  children,
  className,
  color = '--mind-a',
  trailColor,
  duration = 4,
  thickness = 1,
  radius = 10,
  trailLength = 0.3,
  stars = 1,
  glow = 0.6,
}: StarBorderProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useShouldReduceMotion();
  const settings = {
    color,
    trailColor: trailColor ?? color,
    duration: Math.max(0.3, duration),
    thickness: Math.max(0.5, thickness),
    radius: Math.max(0, radius),
    trailLength: clamp(trailLength, 0, 1),
    stars: clamp(Math.round(stars), 1, 6),
    glow: clamp(glow, 0, 1),
    reduce,
  };
  const settingsRef = useRef(settings);
  const wakeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    settingsRef.current = settings;
    wakeRef.current?.();
  });

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!root || !canvas || !ctx) return undefined;

    const state = { width: 0, height: 0, dpr: 1, phase: 0, lap: -1, visible: true };
    const colors = { light: false, head: [1, 1, 1] as Rgb, tail: [1, 1, 1] as Rgb };
    let raf = 0;
    let last = performance.now();

    const readColors = () => {
      const s = settingsRef.current;
      colors.light = isLightScheme(root);
      colors.head = readCssColor(root, s.color) ?? colors.head;
      colors.tail = readCssColor(root, s.trailColor) ?? colors.head;
    };

    const draw = () => {
      const s = settingsRef.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (state.width < 2 || state.height < 2) return;
      const offset = (BLEED + s.thickness / 2) * state.dpr;
      ctx.setTransform(state.dpr, 0, 0, state.dpr, offset, offset);
      ctx.globalCompositeOperation = colors.light ? 'source-over' : 'lighter';
      const shape = outline(
        Math.max(1, state.width - s.thickness),
        Math.max(1, state.height - s.thickness),
        s.radius - s.thickness / 2,
      );
      const spacing = shape.total / s.stars;
      const trail = Math.min(shape.total * s.trailLength, spacing * 0.92);
      const steps = clamp(Math.ceil(trail / 3), 2, 60);

      for (let star = 0; star < s.stars; star++) {
        const head = state.phase + star * spacing;
        let [px, py] = pointAt(shape, head);
        for (let i = 1; i <= steps; i++) {
          const [x, y] = pointAt(shape, head - trail * (i / steps));
          const u = 1 - (i - 0.5) / steps;
          const fade = u * u;
          const tone: Rgb = [
            colors.tail[0] + (colors.head[0] - colors.tail[0]) * u,
            colors.tail[1] + (colors.head[1] - colors.tail[1]) * u,
            colors.tail[2] + (colors.head[2] - colors.tail[2]) * u,
          ];
          ctx.lineCap = i === 1 ? 'round' : 'butt';
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(x, y);
          ctx.lineWidth = 2 + 6 * s.glow;
          ctx.strokeStyle = rgba(tone, fade * (colors.light ? 0.1 : 0.2) * s.glow);
          ctx.stroke();
          ctx.lineWidth = s.thickness;
          ctx.strokeStyle = rgba(tone, fade);
          ctx.stroke();
          px = x;
          py = y;
        }
        const [hx, hy] = pointAt(shape, head);
        const reach = (12 + 40 * s.glow) * (colors.light ? 0.6 : 1);
        const bloom = ctx.createRadialGradient(hx, hy, 0, hx, hy, reach);
        const strength = (colors.light ? 0.1 : 0.4) * s.glow;
        bloom.addColorStop(0, rgba(colors.head, strength));
        bloom.addColorStop(0.25, rgba(colors.head, strength * 0.35));
        bloom.addColorStop(1, rgba(colors.head, 0));
        ctx.fillStyle = bloom;
        ctx.fillRect(hx - reach, hy - reach, reach * 2, reach * 2);
      }
    };

    const frame = (now: number) => {
      raf = 0;
      const s = settingsRef.current;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      const total = outline(state.width, state.height, s.radius).total;
      if (!s.reduce) state.phase = wrap(state.phase + (total / s.duration) * dt, total);
      if (state.lap >= 0 && !s.reduce) {
        const before = easeInOut(Math.min(1, state.lap / LAP));
        state.lap += dt;
        state.phase += (easeInOut(Math.min(1, state.lap / LAP)) - before) * total;
        if (state.lap >= LAP) state.lap = -1;
      }
      draw();
      if (!s.reduce && state.visible && !document.hidden) raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    wakeRef.current = wake;

    const measure = () => {
      state.width = root.offsetWidth;
      state.height = root.offsetHeight;
      state.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round((state.width + BLEED * 2) * state.dpr));
      canvas.height = Math.max(1, Math.round((state.height + BLEED * 2) * state.dpr));
      wake();
    };

    const startLap = () => {
      if (state.lap < 0 && !settingsRef.current.reduce) state.lap = 0;
      wake();
    };
    const onFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Element && event.target.matches(':focus-visible')) startLap();
    };
    const onVisibility = () => wake();

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    resizeObserver?.observe(root);
    const intersection =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(entries => {
            state.visible = entries.some(entry => entry.isIntersecting);
            if (state.visible) wake();
          });
    intersection?.observe(root);
    const unsubscribeScheme = subscribeColorScheme(() => {
      readColors();
      wake();
    });
    root.addEventListener('pointerenter', startLap);
    root.addEventListener('focusin', onFocusIn);
    document.addEventListener('visibilitychange', onVisibility);
    readColors();
    measure();

    return () => {
      cancelAnimationFrame(raf);
      wakeRef.current = null;
      resizeObserver?.disconnect();
      intersection?.disconnect();
      unsubscribeScheme();
      root.removeEventListener('pointerenter', startLap);
      root.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <span
      ref={rootRef}
      style={{ borderRadius: radius }}
      className={cn('relative isolate inline-flex', className)}
    >
      <span
        aria-hidden="true"
        style={{ borderRadius: radius }}
        className="pointer-events-none absolute inset-0 -z-[1] shadow-[inset_0_0_0_1px_var(--line)]"
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -left-10 z-[1] h-[calc(100%+80px)] w-[calc(100%+80px)]"
      />
      {children}
    </span>
  );
}
