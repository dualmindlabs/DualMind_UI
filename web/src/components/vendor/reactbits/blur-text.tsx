/**
 * Blur Text, from React Bits by David Haz.
 * Source: https://reactbits.dev/r/BlurText-TS-TW.json (copied 2026-10-20)
 * Licence: MIT + Commons Clause (see ./LICENSE.md). Used as part of this website only.
 * Our changes:
 * - The entrance runs as a CSS animation (styles/effects.css, `animate-blur-in`), so a prerendered
 *   headline animates on load without waiting for JavaScript and stays readable without it.
 *   Reduced motion stops it through base.css and ReducedMotionScope.
 * - `trigger="view"` only hides text after hydration, when it is still below the fold.
 * - `text` also takes segments, so one phrase can carry its own class (the Playfair voice).
 * - `startDelay` offsets the whole stagger, so two lines can play one after the other.
 * - Kept the blur effect and the word and letter modes; removed the zoom, tilt, focus and drift
 *   effects, loops, hover and click replays and colour fades. `as` sets the element.
 * - Screen readers get the whole text once (visually hidden); the animated pieces are hidden.
 */
import { type CSSProperties, type ElementType, Fragment, useEffect, useRef, useState } from 'react';

import { useHydrated } from '@/hooks/use-hydrated';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

export interface BlurTextSegment {
  text: string;
  className?: string;
}

export interface BlurTextProps {
  text: string | BlurTextSegment[];
  as?: ElementType;
  className?: string;
  animateBy?: 'words' | 'letters';
  direction?: 'top' | 'bottom';
  /** Milliseconds between two pieces. */
  delay?: number;
  /** Milliseconds before the first piece (for a second line that follows the first). */
  startDelay?: number;
  /** Seconds for one piece. */
  duration?: number;
  /** Starting blur, in pixels. */
  blur?: number;
  /** `load`: plays as soon as it renders. `view`: the first time it scrolls into view. */
  trigger?: 'load' | 'view';
  onAnimationComplete?: () => void;
}

type ViewState = 'static' | 'waiting' | 'playing';

interface Piece {
  key: string;
  content: string;
  className: string | undefined;
  /** Index of the word the piece belongs to; letters of one word stay on one line. */
  word: number;
  /** Position in the stagger. */
  order: number;
}

function toSegments(text: string | BlurTextSegment[]): BlurTextSegment[] {
  return typeof text === 'string' ? [{ text }] : text;
}

function splitPieces(segments: BlurTextSegment[], animateBy: 'words' | 'letters'): Piece[] {
  const pieces: Piece[] = [];
  let word = 0;
  for (const segment of segments) {
    for (const part of segment.text.split(/\s+/).filter(Boolean)) {
      if (animateBy === 'words') {
        pieces.push({
          key: `w${word}`,
          content: part,
          className: segment.className,
          word,
          order: pieces.length,
        });
      } else {
        Array.from(part).forEach((char, index) =>
          pieces.push({
            key: `w${word}c${index}`,
            content: char,
            className: segment.className,
            word,
            order: pieces.length,
          }),
        );
      }
      word += 1;
    }
  }
  return pieces;
}

/** A headline that resolves out of a blur, word by word or letter by letter. */
export function BlurText({
  text,
  as: Tag = 'p',
  className,
  animateBy = 'words',
  direction = 'top',
  delay = 120,
  startDelay = 0,
  duration,
  blur = 10,
  trigger = 'load',
  onAnimationComplete,
}: BlurTextProps) {
  const ref = useRef<HTMLElement>(null);
  const hydrated = useHydrated();
  const reduce = useShouldReduceMotion();
  const [view, setView] = useState<ViewState>('static');
  const segments = toSegments(text);
  const pieces = splitPieces(segments, animateBy);
  const fullText = segments.map(segment => segment.text.trim()).join(' ');

  useEffect(() => {
    const element = ref.current;
    if (trigger !== 'view' || !hydrated || reduce || !element) return undefined;
    if (typeof IntersectionObserver === 'undefined') return undefined;
    let first = true;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.some(entry => entry.isIntersecting);
      if (first) {
        first = false;
        if (visible) {
          observer.disconnect();
          return;
        }
        setView('waiting');
        return;
      }
      if (visible) {
        setView('playing');
        observer.disconnect();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [trigger, hydrated, reduce]);

  const animate = !reduce && (trigger === 'load' || view === 'playing');
  const hidden = !reduce && trigger === 'view' && view === 'waiting';
  const words = pieces.reduce<Piece[][]>((groups, piece) => {
    (groups[piece.word] ??= []).push(piece);
    return groups;
  }, []);
  const lastOrder = pieces.length - 1;

  return (
    <Tag ref={ref} className={cn('blur-text', className)}>
      <span className="sr-only">{fullText}</span>
      <span aria-hidden="true">
        {words.map((group, index) => (
          <Fragment key={group[0]?.key ?? index}>
            {index > 0 ? ' ' : null}
            <span className="inline-block whitespace-nowrap">
              {group.map(piece => {
                const last = piece.order === lastOrder;
                const style = {
                  animationDelay: `${startDelay + piece.order * delay}ms`,
                  '--blur-in-blur': `${blur}px`,
                  '--blur-in-offset': direction === 'top' ? '-0.6em' : '0.6em',
                  ...(duration === undefined ? {} : { '--blur-in-duration': `${duration}s` }),
                } as CSSProperties;
                return (
                  <span
                    key={piece.key}
                    style={animate ? style : undefined}
                    className={cn(
                      'inline-block',
                      animate && 'animate-blur-in will-change-[transform,filter,opacity]',
                      hidden && 'opacity-0',
                      piece.className,
                    )}
                    onAnimationEnd={last && onAnimationComplete ? onAnimationComplete : undefined}
                  >
                    {piece.content}
                  </span>
                );
              })}
            </span>
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}
