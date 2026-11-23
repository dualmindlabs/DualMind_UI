import { useEffect, useRef } from 'react';

import { useMediaQuery } from '@/hooks/use-media-query';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';

/**
 * The hero's background: Mind A and Mind B pools of light on the deep background (`mesh-duel`), a
 * fading grid for precision and, on a mouse, a soft light that follows the pointer (a gradient
 * moved with `transform`, never repainted). All of it is static CSS in the prerendered HTML; the
 * pointer light needs a fine pointer and motion allowed. Decorative.
 */
export function HeroBackdrop() {
  const light = useRef<HTMLDivElement>(null);
  const reduce = useShouldReduceMotion();
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)');
  const enabled = finePointer && !reduce;

  useEffect(() => {
    const element = light.current;
    const host = element?.parentElement;
    if (!enabled || !element || !host) return undefined;
    let frame = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      frame = 0;
      element.style.transform = `translate3d(${x - 288}px, ${y - 288}px, 0)`;
      element.style.opacity = '1';
    };
    const onMove = (event: PointerEvent) => {
      const box = host.getBoundingClientRect();
      x = event.clientX - box.left;
      y = event.clientY - box.top;
      if (y < 0 || y > box.height) return;
      if (frame === 0) frame = requestAnimationFrame(paint);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [enabled]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 mesh-duel" />
      <div className="absolute inset-x-0 top-0 h-[44rem] bg-grid opacity-80" />
      <div className="absolute inset-0">
        <div className="grain size-full" />
      </div>
      {enabled ? (
        <div
          ref={light}
          className="absolute top-0 left-0 size-[36rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--fg)_8%,transparent),transparent)] opacity-0 transition-[transform,opacity] duration-700 ease-out will-change-transform"
        />
      ) : null}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-b from-transparent to-bg" />
    </div>
  );
}
