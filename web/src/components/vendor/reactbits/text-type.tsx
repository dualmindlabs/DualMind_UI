/**
 * Text Type, from React Bits by David Haz.
 * Source: https://reactbits.dev/r/TextType-TS-TW.json (copied 2026-10-20)
 * Licence: MIT + Commons Clause (see ./LICENSE.md). Used as part of this website only.
 * Our changes:
 * - No GSAP: the caret blinks with a CSS animation (styles/effects.css, `animate-caret`) and sits
 *   after the text instead of gliding.
 * - `paused` freezes typing (the composer pauses it while the field has focus).
 * - Reduced motion shows the first sentence in full, without typing or blinking.
 * - `decorative` hides it from screen readers (rotating example prompts); otherwise they get
 *   every sentence once, visually hidden, and never the typing itself.
 * - Kept sentences, typing and deleting speeds, pauses and loop; removed typos, select-delete,
 *   reverse mode, per-sentence colours, prefix, variable speed and the character effects.
 */
import { type ElementType, useEffect, useState } from 'react';

import { useHydrated } from '@/hooks/use-hydrated';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

export interface TextTypeProps {
  text: string | string[];
  as?: ElementType;
  className?: string;
  /** Milliseconds per character. */
  typingSpeed?: number;
  deletingSpeed?: number;
  /** Milliseconds a finished sentence stays before it is deleted. */
  pauseDuration?: number;
  initialDelay?: number;
  loop?: boolean;
  showCursor?: boolean;
  cursorClassName?: string;
  /** Stop typing where it is, for example while a text field has focus. */
  paused?: boolean;
  /** Hide from screen readers (the text is only an example). */
  decorative?: boolean;
}

interface TypeState {
  sentence: number;
  count: number;
  deleting: boolean;
}

/** Sentences typed out and deleted in turn, with a blinking caret. */
export function TextType({
  text,
  as: Tag = 'span',
  className,
  typingSpeed = 45,
  deletingSpeed = 25,
  pauseDuration = 2000,
  initialDelay = 0,
  loop = true,
  showCursor = true,
  cursorClassName,
  paused = false,
  decorative = false,
}: TextTypeProps) {
  const sentences = Array.isArray(text) ? text : [text];
  const hydrated = useHydrated();
  const reduce = useShouldReduceMotion();
  // count -1: the first sentence in full, as prerendered; typing takes over after hydration.
  const [state, setState] = useState<TypeState>({ sentence: 0, count: -1, deleting: false });
  const still = reduce || !hydrated;
  const current = sentences[state.sentence % sentences.length] ?? '';
  const characters = Array.from(current);
  const shownCount = still || state.count < 0 ? characters.length : state.count;

  useEffect(() => {
    if (still || paused || sentences.length === 0) return undefined;
    const total = characters.length;
    const { count, deleting, sentence } = state;
    let wait: number;
    let next: TypeState;

    if (count < 0) {
      // Start from the prerendered sentence: hold it, then delete it and type the next one.
      if (!loop && sentences.length <= 1) return undefined;
      wait = initialDelay + pauseDuration;
      next = { sentence, count: total, deleting: true };
    } else if (!deleting && count < total) {
      wait = typingSpeed;
      next = { sentence, count: count + 1, deleting: false };
    } else if (!deleting) {
      if (!loop && sentence >= sentences.length - 1) return undefined;
      wait = pauseDuration;
      next = { sentence, count, deleting: true };
    } else if (count > 0) {
      wait = deletingSpeed;
      next = { sentence, count: count - 1, deleting: true };
    } else {
      wait = typingSpeed * 4;
      next = { sentence: (sentence + 1) % sentences.length, count: 0, deleting: false };
    }

    const timer = window.setTimeout(() => setState(next), wait);
    return () => window.clearTimeout(timer);
  }, [
    still,
    paused,
    state,
    sentences.length,
    characters.length,
    initialDelay,
    typingSpeed,
    deletingSpeed,
    pauseDuration,
    loop,
  ]);

  return (
    <Tag className={cn('inline whitespace-pre-wrap', className)} aria-hidden={decorative || undefined}>
      {decorative ? null : <span className="sr-only">{sentences.join(' ')}</span>}
      <span aria-hidden="true">
        {characters.slice(0, shownCount).join('')}
        {showCursor ? (
          <span
            className={cn(
              'ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[0.15em] rounded-[1px] bg-current',
              !still && !paused && 'animate-caret',
              cursorClassName,
            )}
          />
        ) : null}
      </span>
    </Tag>
  );
}
