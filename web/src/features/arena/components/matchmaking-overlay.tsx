import { type Ref, useEffect, useRef, useState } from 'react';

import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

import type { ArenaMode } from '../lib/modes';
import { canAnimate, EXPO, playOn } from './stage-motion';

const STEPS: Record<Exclude<ArenaMode, 'direct'>, readonly string[]> = {
  battle: ['Drawing two names from the pool', 'Keeping them anonymous', 'Handing them your prompt'],
  side: ['Calling the two models you picked', 'Handing them your prompt', 'Waiting for both'],
};

function Orb({ who, ref }: { who: 'a' | 'b'; ref: Ref<HTMLSpanElement> }) {
  return (
    <span
      ref={ref}
      className={cn(
        'grid size-16 place-items-center rounded-full border font-mono text-h3 font-semibold sm:size-20',
        who === 'a'
          ? 'border-mind-a-edge bg-mind-a-tint text-mind-a glow-a'
          : 'border-mind-b-edge bg-mind-b-tint text-mind-b-text glow-b',
      )}
    >
      {who === 'a' ? 'A' : 'B'}
    </span>
  );
}

/**
 * The matchmaking beat: while the first prompt of a battle is on its way, two anonymous orbs
 * travel together around a VS medallion under "Finding two models", with a line that moves
 * through what is happening. It covers the stage only while the turn is submitting, then fades
 * (it never delays the answers) and is decoration: the arena announces the state itself.
 * Under reduced motion the orbs rest in place and the text stays on its first line.
 */
export function MatchmakingOverlay({
  active,
  mode,
}: {
  active: boolean;
  mode: Exclude<ArenaMode, 'direct'>;
}) {
  const reduce = useShouldReduceMotion();
  const animated = canAnimate() && !reduce;
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const root = useRef<HTMLDivElement | null>(null);
  const orbA = useRef<HTMLSpanElement | null>(null);
  const orbB = useRef<HTMLSpanElement | null>(null);
  const link = useRef<HTMLSpanElement | null>(null);
  const ring = useRef<HTMLSpanElement | null>(null);
  const steps = STEPS[mode];

  // Mount when it starts; unmount at once where there is nothing to fade.
  if (active && !mounted) setMounted(true);
  if (!active && mounted && !animated) setMounted(false);

  useEffect(() => {
    if (!mounted || !animated) return;
    const plays = [
      playOn(
        orbA.current,
        [
          { transform: 'translateX(-7rem) scale(0.8)', opacity: 0 },
          { transform: 'translateX(0) scale(1)', opacity: 1 },
        ],
        { duration: 900, easing: EXPO, fill: 'both' },
      ),
      playOn(
        orbB.current,
        [
          { transform: 'translateX(7rem) scale(0.8)', opacity: 0 },
          { transform: 'translateX(0) scale(1)', opacity: 1 },
        ],
        { duration: 900, easing: EXPO, fill: 'both' },
      ),
      playOn(link.current, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
        duration: 700,
        delay: 240,
        easing: EXPO,
        fill: 'both',
      }),
      playOn(
        ring.current,
        [
          { transform: 'scale(1)', opacity: 0.6 },
          { transform: 'scale(2)', opacity: 0 },
        ],
        { duration: 1500, delay: 600, iterations: Infinity, easing: 'ease-out' },
      ),
    ];
    const timer = window.setInterval(() => setStep(value => (value + 1) % steps.length), 1300);
    return () => {
      window.clearInterval(timer);
      for (const play of plays) play?.cancel();
    };
  }, [mounted, animated, steps.length]);

  // Fade out when the answers arrive.
  useEffect(() => {
    if (active || !mounted || !animated) return;
    const fade = playOn(root.current, [{ opacity: 1 }, { opacity: 0 }], {
      duration: 260,
      easing: EXPO,
      fill: 'forwards',
    });
    if (!fade) return;
    fade.onfinish = () => {
      setMounted(false);
      setStep(0);
    };
    return () => fade.cancel();
  }, [active, mounted, animated]);

  if (!mounted) return null;

  return (
    <div
      ref={root}
      aria-hidden="true"
      data-testid="matchmaking"
      className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-bg/92 px-6"
    >
      <div className="grid justify-items-center gap-8 text-center">
        <div className="flex items-center">
          <Orb who="a" ref={orbA} />
          <span className="relative mx-3 flex w-16 items-center justify-center sm:mx-4 sm:w-24">
            <span
              ref={link}
              className="absolute inset-x-0 h-px origin-center bg-linear-to-r from-mind-a via-fg-soft to-mind-b"
            />
            <span
              ref={ring}
              className="absolute size-9 rounded-full border border-fg-soft opacity-0"
            />
            <span className="relative grid size-9 place-items-center rounded-full border border-line-strong bg-surface-2 font-mono text-label font-semibold text-fg-soft shadow-raise">
              VS
            </span>
          </span>
          <Orb who="b" ref={orbB} />
        </div>
        <div className="grid gap-2">
          <p className="text-h3 font-semibold tracking-tight text-fg">Finding two models</p>
          <p key={step} className="min-h-6 text-ui text-fg-soft motion-safe:animate-rise">
            {steps[step]}
          </p>
        </div>
      </div>
    </div>
  );
}
