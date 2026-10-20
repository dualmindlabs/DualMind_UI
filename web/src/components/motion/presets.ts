import type { Transition } from 'motion/react';

import { durations, easings, spring } from '@/styles/tokens';

/**
 * Motion presets from the design tokens (styles/tokens.ts, design-direction.md section 6), in
 * the units Motion expects: seconds and cubic-bezier points. Components use these instead of
 * their own numbers.
 */

type Bezier = [number, number, number, number];

function seconds(name: string, fallback: number): number {
  return (durations.find(token => token.name === name)?.ms ?? fallback) / 1000;
}

function bezier(name: string, fallback: Bezier): Bezier {
  return easings.find(token => token.name === name)?.points ?? fallback;
}

export const duration = {
  instant: seconds('--dur-instant', 90),
  fast: seconds('--dur-fast', 160),
  base: seconds('--dur-base', 240),
  slow: seconds('--dur-slow', 420),
  cinematic: seconds('--dur-cinematic', 900),
} as const;

export const ease = {
  outExpo: bezier('--ease-out-expo', [0.22, 1, 0.36, 1]),
  inOut: bezier('--ease-in-out', [0.65, 0, 0.35, 1]),
} as const;

export const transitions = {
  /** Hovers, menus, tooltips. */
  fast: { duration: duration.fast, ease: ease.outExpo },
  /** Panels, tabs, list changes; the MotionProvider default. */
  base: { duration: duration.base, ease: ease.outExpo },
  /** Drawers and content cross-fades. */
  slow: { duration: duration.slow, ease: ease.outExpo },
  /** The hero entrance and the reveal only. */
  cinematic: { duration: duration.cinematic, ease: ease.outExpo },
  /** Moves and morphs. */
  move: { duration: duration.base, ease: ease.inOut },
  /** Layout changes and sliding indicators. */
  spring: { type: 'spring', stiffness: spring.stiffness, damping: spring.damping },
} satisfies Record<string, Transition>;
