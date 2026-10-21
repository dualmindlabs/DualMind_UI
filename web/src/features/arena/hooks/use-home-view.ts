import { useEffect } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useHydrated } from '@/hooks/use-hydrated';
import { ARENA_ATTRIBUTE } from '@/lib/session/handoff';

/** What `/` shows: the landing page, the arena's loading frame, or the arena. */
export type HomeView = 'landing' | 'boot' | 'arena';

function marked(): boolean {
  return typeof document !== 'undefined' && document.documentElement.hasAttribute(ARENA_ATTRIBUTE);
}

/**
 * The landing page or the signed-in arena (src/lib/session/handoff.ts). The prerendered HTML and
 * the first render after hydration are always the landing page (with the hidden loading frame),
 * so hydration matches; then, when the head script marked <html data-arena>, the arena takes over
 * once the session is confirmed. A session that turns out to be gone (or a sign-out) brings the
 * landing page back.
 */
export function useHomeView(): HomeView {
  const hydrated = useHydrated();
  const { status } = useAuth();
  const wantsArena = hydrated && marked();
  const signedOut = status === 'signed-out' || status === 'unavailable';

  useEffect(() => {
    if (wantsArena && signedOut) document.documentElement.removeAttribute(ARENA_ATTRIBUTE);
  }, [wantsArena, signedOut]);

  if (!wantsArena || signedOut) return 'landing';
  return status === 'signed-in' ? 'arena' : 'boot';
}
