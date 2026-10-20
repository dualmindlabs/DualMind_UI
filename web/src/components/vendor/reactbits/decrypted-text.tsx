/**
 * Decrypted Text, from React Bits by David Haz.
 * Source: https://reactbits.dev/r/DecryptedText-TS-TW.json (copied 2026-10-20)
 * Licence: MIT + Commons Clause (see ./LICENSE.md). Used as part of this website only.
 * Our changes:
 * - Triggers: `mount` (content that appears after hydration, such as revealed model names),
 *   `view` and `hover`. Prerendered text stays readable; it only scrambles once it plays.
 * - Reduced motion (useShouldReduceMotion) shows the plain text and never scrambles.
 * - The first scrambled glyphs are derived from the text, so rendering stays pure; random
 *   glyphs are only picked in the timer.
 * - Kept the scramble effect, sequential reveal and reveal directions; removed the flip and fade
 *   effects, hover radius, click modes, loops, colour tints and glyph squeezing. Named export.
 * - Screen readers get the real text once (visually hidden); the glyphs are hidden.
 */
import { useEffect, useRef, useState } from 'react';

import { useHydrated } from '@/hooks/use-hydrated';
import { useInView } from '@/hooks/use-in-view';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

export interface DecryptedTextProps {
  text: string;
  /** Milliseconds per step. */
  speed?: number;
  /** Steps before everything is revealed (when not sequential). */
  maxIterations?: number;
  /** Reveal one character per step, in `revealDirection` order. */
  sequential?: boolean;
  revealDirection?: 'start' | 'end' | 'center';
  characters?: string;
  animateOn?: 'mount' | 'view' | 'hover';
  className?: string;
  /** Classes for the characters that are still scrambled. */
  encryptedClassName?: string;
  onComplete?: () => void;
}

interface Frame {
  shown: string[];
  revealed: boolean[];
}

const DEFAULT_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/';

const isSpace = (char: string) => /\s/.test(char);

function revealedFrame(chars: string[]): Frame {
  return { shown: chars, revealed: chars.map(() => true) };
}

/** Deterministic first scramble, so the render does not call Math.random(). */
function scrambledFrame(chars: string[], pool: string[]): Frame {
  return {
    shown: chars.map((char, index) =>
      isSpace(char) ? char : (pool[((char.codePointAt(0) ?? 0) + index * 7) % pool.length] ?? char),
    ),
    revealed: chars.map(isSpace),
  };
}

function revealOrder(chars: string[], direction: 'start' | 'end' | 'center'): number[] {
  const order = chars.flatMap((char, index) => (isSpace(char) ? [] : [index]));
  if (direction === 'end') return order.reverse();
  if (direction === 'center') {
    const middle = (chars.length - 1) / 2;
    return order.sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle));
  }
  return order;
}

/** Text that decodes from random glyphs into the real string. */
export function DecryptedText({
  text,
  speed = 50,
  maxIterations = 10,
  sequential = false,
  revealDirection = 'start',
  characters = DEFAULT_CHARACTERS,
  animateOn = 'mount',
  className,
  encryptedClassName,
  onComplete,
}: DecryptedTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const hydrated = useHydrated();
  const reduce = useShouldReduceMotion();
  const inView = useInView(ref, { once: true, threshold: 0.1 });
  const chars = Array.from(text);
  const pool = Array.from(characters);
  // Content mounted after hydration starts scrambled; prerendered text starts readable.
  const [frame, setFrame] = useState<Frame>(() =>
    hydrated && animateOn === 'mount' && !reduce
      ? scrambledFrame(chars, pool)
      : revealedFrame(chars),
  );
  const [runs, setRuns] = useState(animateOn === 'hover' ? 0 : 1);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const completeRef = useRef(onComplete);

  useEffect(() => {
    completeRef.current = onComplete;
  });

  const ready = animateOn === 'view' ? inView : true;

  useEffect(() => {
    if (reduce || !hydrated || !ready || runs === 0) return undefined;
    const letters = Array.from(text);
    const glyphs = Array.from(characters);
    const order = revealOrder(letters, revealDirection);
    const done = new Set<number>();
    let iteration = 0;

    const random = () => glyphs[Math.floor(Math.random() * glyphs.length)] ?? '';
    const paint = () =>
      setFrame({
        shown: letters.map((char, index) =>
          isSpace(char) || done.has(index) ? char : random(),
        ),
        revealed: letters.map((char, index) => isSpace(char) || done.has(index)),
      });

    timerRef.current = setInterval(() => {
      iteration += 1;
      if (sequential) {
        const next = order[done.size];
        if (next !== undefined) done.add(next);
      } else if (iteration >= maxIterations) {
        order.forEach(index => done.add(index));
      }
      paint();
      if (done.size >= order.length) {
        clearInterval(timerRef.current);
        completeRef.current?.();
      }
    }, Math.max(16, speed));

    return () => clearInterval(timerRef.current);
  }, [reduce, hydrated, ready, runs, text, characters, revealDirection, sequential, maxIterations, speed]);

  const shown = reduce ? revealedFrame(chars) : frame;

  return (
    <span
      ref={ref}
      className={cn('inline-block whitespace-pre-wrap', className)}
      onPointerEnter={animateOn === 'hover' ? () => setRuns(count => count + 1) : undefined}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {chars.map((char, index) => {
          const revealed = shown.revealed[index] ?? true;
          if (revealed || isSpace(char)) return <span key={index}>{char}</span>;
          return (
            <span key={index} className={cn('relative inline-block', encryptedClassName)}>
              <span className="invisible">{char}</span>
              <span className="absolute inset-x-0 top-0 text-center">
                {shown.shown[index] ?? char}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
