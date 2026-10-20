/**
 * Glowing Effect, from Aceternity UI (free tier).
 * Source: https://ui.aceternity.com/registry/glowing-effect.json (copied 2026-10-20)
 * Licence: Aceternity UI licence, https://ui.aceternity.com/licence (see ./LICENSE-NOTES.md).
 * Our changes:
 * - The glow is a conic gradient of the three role tokens (Mind A, Mind B, Human) instead of
 *   the fixed pink, gold, green and blue palette.
 * - On by default (the original defaulted to `disabled`); off under reduced motion, for touch
 *   input and in hidden tabs. Listens on window instead of document.body; angle easing from the
 *   motion tokens.
 * - Removed the `white` variant and `React.memo`. Decorative (aria-hidden).
 */
import { animate } from 'motion/react';
import { type CSSProperties, useEffect, useRef } from 'react';

import { ease } from '@/components/motion/presets';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

export interface GlowingEffectProps {
  /** Blur of the glow, in pixels. */
  blur?: number;
  /** Share of the centre (0 to 1) where the glow switches off. */
  inactiveZone?: number;
  /** How far outside the element the glow stays on, in pixels. */
  proximity?: number;
  /** Angular size of the glow, in degrees. */
  spread?: number;
  /** Keep the static border visible. */
  glow?: boolean;
  disabled?: boolean;
  /** Seconds the glow takes to follow the pointer. */
  movementDuration?: number;
  borderWidth?: number;
  className?: string;
}

const GRADIENT = `radial-gradient(circle, var(--mind-a) 10%, transparent 20%),
  radial-gradient(circle at 40% 40%, var(--human) 5%, transparent 15%),
  radial-gradient(circle at 60% 60%, var(--mind-b) 10%, transparent 20%),
  repeating-conic-gradient(from 236.84deg at 50% 50%, var(--mind-a) 0%, var(--mind-b) calc(25% / 5), var(--human) calc(50% / 5), var(--mind-b) calc(75% / 5), var(--mind-a) calc(100% / 5))`;

/** A border light that turns to follow the pointer: the feature cards. */
export function GlowingEffect({
  blur = 0,
  inactiveZone = 0.7,
  proximity = 0,
  spread = 20,
  glow = false,
  disabled = false,
  movementDuration = 2,
  borderWidth = 1,
  className,
}: GlowingEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduce = useShouldReduceMotion();
  const off = disabled || reduce;
  const settingsRef = useRef({ inactiveZone, proximity, movementDuration });

  useEffect(() => {
    settingsRef.current = { inactiveZone, proximity, movementDuration };
  });

  useEffect(() => {
    const element = containerRef.current;
    if (off || !element) return undefined;
    const last = { x: 0, y: 0 };
    let frame = 0;
    let tween: { stop: () => void } | null = null;

    const handleMove = (point?: { x: number; y: number }) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const s = settingsRef.current;
        const { left, top, width, height } = element.getBoundingClientRect();
        const mouseX = point?.x ?? last.x;
        const mouseY = point?.y ?? last.y;
        if (point) {
          last.x = mouseX;
          last.y = mouseY;
        }
        const centerX = left + width * 0.5;
        const centerY = top + height * 0.5;
        const distance = Math.hypot(mouseX - centerX, mouseY - centerY);
        if (distance < 0.5 * Math.min(width, height) * s.inactiveZone) {
          element.style.setProperty('--active', '0');
          return;
        }
        const active =
          mouseX > left - s.proximity &&
          mouseX < left + width + s.proximity &&
          mouseY > top - s.proximity &&
          mouseY < top + height + s.proximity;
        element.style.setProperty('--active', active ? '1' : '0');
        if (!active) return;
        const currentAngle = parseFloat(element.style.getPropertyValue('--start')) || 0;
        const targetAngle = (180 * Math.atan2(mouseY - centerY, mouseX - centerX)) / Math.PI + 90;
        const angleDiff = ((targetAngle - currentAngle + 180) % 360) - 180;
        tween?.stop();
        tween = animate(currentAngle, currentAngle + angleDiff, {
          duration: s.movementDuration,
          ease: ease.outExpo,
          onUpdate: value => element.style.setProperty('--start', String(value)),
        });
      });
    };

    const onScroll = () => handleMove();
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      handleMove({ x: event.clientX, y: event.clientY });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      tween?.stop();
      element.style.setProperty('--active', '0');
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, [off]);

  const style = {
    '--blur': `${blur}px`,
    '--spread': spread,
    '--start': '0',
    '--active': '0',
    '--glowingeffect-border-width': `${borderWidth}px`,
    '--gradient': GRADIENT,
  } as CSSProperties;

  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -inset-px hidden rounded-[inherit] border border-line opacity-0 transition-opacity',
          glow && 'opacity-100',
          off && 'block!',
        )}
      />
      <div
        ref={containerRef}
        aria-hidden="true"
        style={style}
        className={cn(
          'pointer-events-none absolute inset-0 rounded-[inherit] opacity-100 transition-opacity',
          blur > 0 && 'blur-(--blur)',
          className,
          off && 'hidden!',
        )}
      >
        <div
          className={cn(
            'rounded-[inherit]',
            'after:absolute after:inset-[calc(-1*var(--glowingeffect-border-width))] after:rounded-[inherit] after:content-[""]',
            'after:[border:var(--glowingeffect-border-width)_solid_transparent]',
            'after:[background-attachment:fixed] after:[background:var(--gradient)]',
            'after:opacity-(--active) after:transition-opacity after:duration-300',
            'after:[mask-clip:padding-box,border-box]',
            'after:[mask-composite:intersect]',
            'after:[mask-image:linear-gradient(#0000,#0000),conic-gradient(from_calc((var(--start)-var(--spread))*1deg),#00000000_0deg,#fff,#00000000_calc(var(--spread)*2deg))]',
          )}
        />
      </div>
    </>
  );
}
