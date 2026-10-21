import { useEffect, useState } from 'react';

import { REVEAL_MS } from './use-battle';

/** The first `share` (0 to 1) of a text, cut at a word boundary. */
export function revealSlice(text: string, share: number): string {
  if (share >= 1) return text;
  if (share <= 0) return '';
  const target = Math.floor(text.length * share);
  const space = text.indexOf(' ', target);
  return space === -1 ? text : text.slice(0, space);
}

/**
 * The progressive reveal of a finished answer: word chunks at a readable pace over REVEAL_MS,
 * about twenty steps (no fake typing). Instant when `active` is false (reduced motion, Show all,
 * or the reveal is over).
 */
export function useRevealText(text: string, startedAt: number | null, active: boolean): string {
  const [share, setShare] = useState(0);

  useEffect(() => {
    if (!active || startedAt === null) return;
    const tick = () => setShare(Math.min(1, (Date.now() - startedAt) / REVEAL_MS));
    const timer = window.setInterval(tick, 60);
    return () => window.clearInterval(timer);
  }, [active, startedAt]);

  return active ? revealSlice(text, share) : text;
}
