/**
 * Fuzzy Text, from React Bits by David Haz.
 * Source: https://reactbits.dev/r/FuzzyText-TS-TW.json (copied 2026-10-20)
 * Licence: MIT + Commons Clause (see ./LICENSE.md). Used as part of this website only.
 * Our changes:
 * - The real text is always in the page: visually hidden for screen readers, and shown as plain
 *   text until the canvas is ready, without JavaScript, and under reduced motion (no fuzz).
 * - Colour follows the element's text colour (a token class such as `text-muted`) and theme
 *   changes; the font defaults to the page font; pixel ratio capped at 1.5.
 * - Kept the horizontal fuzz, base and hover intensity, range, frame rate and the intro;
 *   removed the vertical and both directions, click bursts, glitch mode, gradients, colour
 *   split, letter spacing and slice size. Named export.
 */
import { type CSSProperties, useEffect, useRef } from 'react';

import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

export interface FuzzyTextProps {
  children: string;
  className?: string;
  /** Any CSS font size. */
  fontSize?: string;
  fontWeight?: number;
  /** Fuzz at rest, 0 to 1. */
  baseIntensity?: number;
  /** Fuzz under the pointer, 0 to 1. */
  hoverIntensity?: number;
  /** Largest horizontal shift, in pixels. */
  fuzzRange?: number;
  fps?: number;
  /** Starts very fuzzy and settles. */
  intro?: boolean;
}

const INTRO_MS = 1400;
const INTRO_PEAK = 2;

/** Text that jitters like a bad signal: the 404 page. */
export function FuzzyText({
  children,
  className,
  fontSize = 'clamp(4rem, 14vw, 9rem)',
  fontWeight = 800,
  baseIntensity = 0.18,
  hoverIntensity = 0.5,
  fuzzRange = 30,
  fps = 50,
  intro = true,
}: FuzzyTextProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useShouldReduceMotion();
  const tuningRef = useRef({ baseIntensity, hoverIntensity, fps, intro });
  const text = children;

  useEffect(() => {
    tuningRef.current = { baseIntensity, hoverIntensity, fps, intro };
  });

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (reduce || !root || !canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const source = document.createElement('canvas');
    const sourceCtx = source.getContext('2d');
    if (!ctx || !sourceCtx) return undefined;

    const padX = fuzzRange + 20;
    const inset = 5;
    let cancelled = false;
    let built = false;
    let visible = true;
    let frame = 0;
    let lastFrame = 0;
    let hovering = false;
    let introStart = 0;
    let introDone = !tuningRef.current.intro;
    let dpr = 1;
    let font = '';
    let ink = '';
    let rows = new Int32Array(1);
    let box = { left: 0, ascent: 0, width: 0, height: 0, cssWidth: 0, cssHeight: 0 };

    const resolveFont = () => {
      const style = getComputedStyle(canvas);
      return `${fontWeight} ${style.fontSize} ${style.fontFamily || 'sans-serif'}`;
    };

    const paintSource = () => {
      sourceCtx.setTransform(1, 0, 0, 1, 0, 0);
      sourceCtx.clearRect(0, 0, source.width, source.height);
      sourceCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sourceCtx.font = font;
      sourceCtx.textBaseline = 'alphabetic';
      sourceCtx.fillStyle = ink;
      sourceCtx.fillText(text, inset + box.left, box.ascent);
    };

    const draw = (intensity: number) => {
      const amp = intensity * fuzzRange * dpr;
      const ox = Math.round(padX * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (amp < 0.5) {
        ctx.drawImage(source, ox, 0);
        return;
      }
      for (let y = 0, index = 0; y < source.height; y++, index++) {
        rows[index] = Math.round((Math.random() - 0.5) * amp);
        ctx.drawImage(source, 0, y, source.width, 1, ox + (rows[index] ?? 0), y, source.width, 1);
      }
    };

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      font = resolveFont();
      ink = getComputedStyle(canvas).color;
      sourceCtx.setTransform(1, 0, 0, 1, 0, 0);
      sourceCtx.font = font;
      const metrics = sourceCtx.measureText(text);
      const left = metrics.actualBoundingBoxLeft;
      const width = Math.max(1, Math.ceil(left + metrics.actualBoundingBoxRight));
      const ascent = metrics.actualBoundingBoxAscent;
      const height = Math.max(1, Math.ceil(ascent + metrics.actualBoundingBoxDescent));
      box = {
        left,
        ascent,
        width,
        height,
        cssWidth: width + inset * 2 + padX * 2,
        cssHeight: height,
      };
      source.width = Math.ceil((width + inset * 2) * dpr);
      source.height = Math.ceil(height * dpr);
      canvas.width = Math.ceil(box.cssWidth * dpr);
      canvas.height = Math.ceil(box.cssHeight * dpr);
      canvas.style.width = `${box.cssWidth}px`;
      canvas.style.height = `${box.cssHeight}px`;
      rows = new Int32Array(source.height + 1);
      paintSource();
      built = true;
      draw(tuningRef.current.baseIntensity);
      // Swap the plain text for the canvas (styled through the data attribute, no re-render).
      root.dataset.ready = 'true';
    };

    const tick = (now: number) => {
      frame = 0;
      if (cancelled || !visible || document.hidden) return;
      frame = requestAnimationFrame(tick);
      const tuning = tuningRef.current;
      const interval = 1000 / Math.max(1, tuning.fps);
      if (now - lastFrame < interval - 1) return;
      lastFrame = now;
      const color = getComputedStyle(canvas).color;
      if (color !== ink) {
        ink = color;
        paintSource();
      }
      let level = hovering ? tuning.hoverIntensity : tuning.baseIntensity;
      if (!introDone) {
        if (!introStart) introStart = now;
        const progress = Math.min(1, (now - introStart) / INTRO_MS);
        level += (INTRO_PEAK - level) * Math.pow(1 - progress, 2.5);
        if (progress >= 1) introDone = true;
      }
      draw(level);
    };

    const wake = () => {
      if (!frame && built && !cancelled) frame = requestAnimationFrame(tick);
    };

    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(entries => {
            visible = entries.some(entry => entry.isIntersecting);
            wake();
          });
    observer?.observe(canvas);

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left - padX - inset;
      hovering = x >= 0 && x <= box.width;
    };
    const onLeave = () => {
      hovering = false;
    };
    const onVisibility = () => wake();
    const onResize = () => {
      if (built && Math.min(window.devicePixelRatio || 1, 1.5) !== dpr) build();
      else if (built && resolveFont() !== font) build();
    };

    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', onResize);

    const start = async () => {
      try {
        await document.fonts.load(resolveFont());
      } catch {
        await document.fonts.ready;
      }
      if (cancelled) return;
      build();
      wake();
    };
    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
      delete root.dataset.ready;
    };
  }, [reduce, text, fontWeight, fuzzRange]);

  const fontStyle: CSSProperties = { fontSize, fontWeight, lineHeight: 1 };

  return (
    <span
      ref={rootRef}
      className={cn('group/fuzzy relative inline-block', className)}
      style={fontStyle}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="inline-block group-data-[ready=true]/fuzzy:hidden">
        {text}
      </span>
      {reduce ? null : (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          style={{ marginInline: -(fuzzRange + 20) }}
          className="absolute top-0 left-0 max-w-none align-baseline opacity-0 group-data-[ready=true]/fuzzy:static group-data-[ready=true]/fuzzy:opacity-100"
        />
      )}
    </span>
  );
}
