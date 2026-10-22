import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { SkipLink } from '@/components/layout/skip-link';
import { Kbd } from '@/components/ui/kbd';
import { useApiClient } from '@/hooks/use-api-client';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { threadsQuery } from '@/lib/api';
import { cn } from '@/lib/utils/cn';

import { ArenaContext, useArena } from '../hooks/use-arena';
import { useArenaCommands } from '../hooks/use-arena-commands';
import { useArenaShortcuts } from '../hooks/use-arena-shortcuts';
import { useDraft } from '../hooks/use-draft';
import { useOfflineLinkGuard } from '../hooks/use-offline-link-guard';
import { ArenaErrorBoundary } from './arena-error-boundary';
import { ArenaHeader } from './arena-header';
import { ArenaProvider } from './arena-provider';
import { Composer, type ComposerPicks } from './composer';
import { EmptyState } from './empty-state';
import { MatchmakingOverlay } from './matchmaking-overlay';
import { OfflineNotice } from './offline-notice';
import { PromptStarters } from './prompt-starters';
import { ShareDialog } from './share-dialog';
import { ShortcutsDialog } from './shortcuts-dialog';
import { EXPO, playOn } from './stage-motion';
import { THREAD_LIMIT } from './thread-panel';
import { ThreadSidebar } from './thread-sidebar';
import { ThreadView } from './thread-view';

/** What the docked prompt box offers below it: three keys, quiet, for people with a keyboard. */
function DockHints() {
  const { shortcutsEnabled } = useArena();
  if (!shortcutsEnabled) return null;
  return (
    <p
      aria-hidden="true"
      className="mt-2 hidden items-center justify-center gap-4 text-caption text-muted md:flex pointer-coarse:hidden"
    >
      <span className="inline-flex items-center gap-1.5">
        <Kbd className="h-5 min-w-5">/</Kbd> prompt
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Kbd className="h-5 min-w-5">1</Kbd>
        <Kbd className="h-5 min-w-5">2</Kbd>
        <Kbd className="h-5 min-w-5">3</Kbd>
        <Kbd className="h-5 min-w-5">4</Kbd> vote
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Kbd className="h-5 min-w-5">[</Kbd> history
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Kbd className="h-5 min-w-5">?</Kbd> shortcuts
      </span>
    </p>
  );
}

/**
 * The battle stage's backdrop: the two minds' pools of light, the grid fading into the dark and,
 * from `md`, a hairline spine where the two answers meet.
 */
function StageBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden mesh-duel"
    >
      <div className="absolute inset-y-0 left-1/2 hidden w-px bg-linear-to-b from-transparent via-line-strong to-transparent md:block" />
    </div>
  );
}

function ArenaLayout({ empty }: { empty: boolean }) {
  const api = useApiClient();
  const { threadId, mode, battle, shareThreadId, closeShare, announce } = useArena();
  const online = useOnlineStatus();
  const reduce = useShouldReduceMotion();
  const { setDraft } = useDraft();
  const threads = useQuery(threadsQuery(api, THREAD_LIMIT));
  const heading = useRef<HTMLHeadingElement>(null);
  useArenaCommands(threads.data);
  useArenaShortcuts();
  useOfflineLinkGuard();

  // The prompt box travels from the middle of the screen to the dock: where it was at the send
  // (heroBox), and the dock it lands in (FLIP, transform only).
  const heroBox = useRef<HTMLDivElement>(null);
  const dock = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const from = useRef<DOMRect | null>(null);
  // The first prompt of a battle was just sent from the empty arena: the matchmaking beat shows
  // until the turn leaves `submitting`.
  const [pairing, setPairing] = useState(false);
  const firstTurn = battle.state.turns[0];

  if (pairing && firstTurn && firstTurn.phase !== 'submitting') setPairing(false);

  useLayoutEffect(() => {
    if (empty) return;
    const start = from.current;
    from.current = null;
    if (reduce) return;
    playOn(
      stage.current,
      [
        { opacity: 0, transform: 'translateY(16px)' },
        { opacity: 1, transform: 'none' },
      ],
      {
        duration: 520,
        easing: EXPO,
      },
    );
    if (!start || !dock.current) return;
    const end = dock.current.getBoundingClientRect();
    const dy = start.top + start.height - (end.top + end.height);
    if (Math.abs(dy) < 4) return;
    playOn(dock.current, [{ transform: `translateY(${dy}px)` }, { transform: 'none' }], {
      duration: 640,
      easing: EXPO,
    });
  }, [empty, reduce]);

  const send = (prompt: string, picks: ComposerPicks) => {
    // Offline there is nothing to ask: keep the draft (the notice says why) instead of firing a
    // request that cannot arrive and would only end in an error.
    if (!online) {
      announce('You are offline. Your prompt is kept; send it when you are back online.');
      return;
    }
    // A battle's follow-up keeps the pair of this session's last battle (blind until the vote).
    const last = [...battle.state.turns].reverse().find(turn => turn.a?.model && turn.b?.model);
    const lastPair =
      last?.a?.model && last.b?.model
        ? {
            a: last.a.model.id ?? last.a.model.name,
            b: last.b.model.id ?? last.b.model.name,
          }
        : null;
    if (empty) {
      from.current = heroBox.current?.getBoundingClientRect() ?? null;
      if (mode !== 'direct') setPairing(true);
    }
    battle.send(prompt, {
      mode,
      pair: mode === 'side' ? picks.pair : mode === 'battle' ? lastPair : null,
      directModel: picks.directModel,
    });
    setDraft('');
  };

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <SkipLink />
      <ArenaHeader staged={!empty} />
      <OfflineNotice />
      <div className="flex min-h-0 flex-1">
        <ThreadSidebar />
        <main
          id="main"
          tabIndex={-1}
          data-testid="arena"
          data-stage={empty ? 'empty' : 'battle'}
          className={cn(
            'relative flex min-w-0 flex-1 flex-col outline-none',
            // Auto margins on the inner wrapper, not justify-*: they centre (or, on a phone, sink)
            // the empty state when it fits and fall back to 0 when it does not, so a short
            // landscape screen scrolls from the heading instead of clipping it.
            empty && 'overflow-y-auto',
          )}
        >
          <ArenaErrorBoundary resetKey={threadId}>
            {empty ? (
              <>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 mesh-duel opacity-90"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-grid opacity-60"
                />
                <div className="relative mx-auto grid w-full max-w-4xl gap-8 px-4 py-8 max-md:mt-auto sm:px-6 md:my-auto md:gap-10">
                  <EmptyState headingRef={heading} />
                  <div ref={heroBox} className="mx-auto w-full max-w-3xl max-md:order-2">
                    <Composer
                      variant="hero"
                      avoidRef={heading}
                      onSend={send}
                      busy={battle.busy}
                      onStop={battle.stop}
                    />
                  </div>
                  <PromptStarters className="mx-auto w-full max-w-3xl max-md:order-1" />
                </div>
              </>
            ) : (
              <>
                <StageBackdrop />
                <div ref={stage} className="relative flex min-h-0 flex-1 flex-col">
                  <ThreadView threadId={threadId} />
                  <MatchmakingOverlay
                    active={pairing && firstTurn?.phase === 'submitting'}
                    mode={mode === 'side' ? 'side' : 'battle'}
                  />
                </div>
                <div
                  ref={dock}
                  className="relative mx-auto w-full max-w-3xl px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6"
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-linear-to-t from-bg-deep to-transparent"
                  />
                  <Composer onSend={send} busy={battle.busy} onStop={battle.stop} />
                  <DockHints />
                </div>
              </>
            )}
          </ArenaErrorBoundary>
        </main>
      </div>
      <ShareDialog threadId={shareThreadId} onClose={closeShare} />
      <ShortcutsDialog />
    </div>
  );
}

/**
 * The shell decides where the history lives. In the empty arena on a wide screen it is docked
 * beside the prompt. Once a battle is on, the stage takes the whole width and the history is a
 * slide-over (the header button, or `[`): the rest of the arena reads `wide` and `toggleHistory`
 * through this context, so it needs no other change.
 */
function StageShell({ children }: { children: (empty: boolean) => ReactNode }) {
  const arena = useArena();
  const empty = arena.threadId === null && arena.battle.state.turns.length === 0;
  const docked = arena.wide && empty;
  const { historyOpen, setHistoryOpen, toggleHistory } = arena;
  const value = useMemo(
    () => ({
      ...arena,
      wide: docked,
      toggleHistory: docked ? toggleHistory : () => setHistoryOpen(!historyOpen),
    }),
    [arena, docked, toggleHistory, setHistoryOpen, historyOpen],
  );
  return <ArenaContext.Provider value={value}>{children(empty)}</ArenaContext.Provider>;
}

/**
 * The signed-in arena at `/` (slice S8, redesigned in A1): the app header, the thread history
 * (docked beside the empty arena on wide screens, a slide-over everywhere else), and the stage:
 * the empty arena with the prompt box as its hero and the starters, or a full-bleed battle stage
 * (an open thread, `/?thread=<id>`) with the prompt box docked under it.
 */
export function ArenaApp() {
  return (
    <ArenaErrorBoundary variant="screen">
      <ArenaProvider>
        <StageShell>{empty => <ArenaLayout empty={empty} />}</StageShell>
      </ArenaProvider>
    </ArenaErrorBoundary>
  );
}
