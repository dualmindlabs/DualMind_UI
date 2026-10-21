import { type RefObject, useEffect, useReducer, useRef, useState } from 'react';

import { useHydrated } from '@/hooks/use-hydrated';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';

import {
  answerFor,
  battleAt,
  demoReducer,
  type DemoState,
  type DemoVote,
  initialDemoState,
  revealPace,
  visibleWordCount,
} from '../lib/demo-machine';

export interface DemoBattleControls {
  state: DemoState;
  /** Words on screen per pane; the full count outside the reveal. */
  shown: { a: number; b: number };
  words: { a: string[]; b: string[] };
  /** Start a battle: `index` picks a recorded battle, `asked` keeps the visitor's own prompt. */
  play: (options?: { index?: number; asked?: string | null }) => void;
  skip: () => void;
  vote: (choice: DemoVote) => void;
  next: () => void;
}

const splitWords = (text: string) => text.split(/\s+/).filter(Boolean);

/**
 * The recorded demo battle: the state machine (lib/demo-machine.ts) plus its timing. Both answers
 * appear word by word in parallel (about 1.4 s, design-direction.md section 6, rule 5); under
 * reduced motion they appear at once. The first play starts when the demo scrolls into view,
 * after hydration: the prerendered page shows both answers, ready to vote; once hydrated they wait
 * (space kept) until the demo is on screen.
 */
export function useDemoBattle(
  rootRef: RefObject<HTMLElement | null>,
  /** False until the demo's own (lazy) section has hydrated; it waits for its server HTML. */
  ready = true,
): DemoBattleControls {
  const reduce = useShouldReduceMotion();
  const hydrated = useHydrated() && ready;
  const [state, dispatch] = useReducer(demoReducer, initialDemoState);
  const [progress, setProgress] = useState({ run: 0, elapsed: 0 });
  const reduceRef = useRef(reduce);

  useEffect(() => {
    reduceRef.current = reduce;
  });

  const battle = battleAt(state.index);
  const words = { a: splitWords(answerFor(battle, 'a')), b: splitWords(answerFor(battle, 'b')) };
  const longest = Math.max(words.a.length, words.b.length);

  // The reveal: a frame loop that only runs while streaming.
  useEffect(() => {
    if (state.phase !== 'streaming') return undefined;
    const pace = revealPace(longest);
    const run = state.run;
    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      start ??= now;
      const elapsed = reduce ? Number.POSITIVE_INFINITY : now - start;
      setProgress({ run, elapsed });
      if (reduce || visibleWordCount(longest, elapsed, pace) >= longest) {
        dispatch({ type: 'streamed' });
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [state.phase, state.run, longest, reduce]);

  // The first play: when the demo comes into view after hydration.
  useEffect(() => {
    const element = rootRef.current;
    if (!hydrated || state.run > 0 || !element) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      const frame = requestAnimationFrame(() => dispatch({ type: 'play', instant: true }));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer.disconnect();
        dispatch({ type: 'play', instant: reduceRef.current });
      },
      { threshold: 0.35 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hydrated, rootRef, state.run]);

  const streaming = state.phase === 'streaming';
  const started = progress.run === state.run;
  // After hydration, the answers wait (empty, their space kept) until the first play.
  const waiting = hydrated && state.run === 0 && !reduce;
  const pace = revealPace(longest);
  const count = (total: number) => {
    if (waiting) return 0;
    if (!streaming) return total;
    return started ? visibleWordCount(total, progress.elapsed, pace) : 0;
  };

  return {
    state,
    shown: { a: count(words.a.length), b: count(words.b.length) },
    words,
    play: (options = {}) => dispatch({ type: 'play', ...options, instant: reduceRef.current }),
    skip: () => dispatch({ type: 'skip' }),
    vote: choice => dispatch({ type: 'vote', choice }),
    next: () => dispatch({ type: 'next', instant: reduceRef.current }),
  };
}
