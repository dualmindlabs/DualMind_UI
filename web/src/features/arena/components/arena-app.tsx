import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';

import { SkipLink } from '@/components/layout/skip-link';
import { useApiClient } from '@/hooks/use-api-client';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { threadsQuery } from '@/lib/api';
import { cn } from '@/lib/utils/cn';

import { useArena } from '../hooks/use-arena';
import { useArenaCommands } from '../hooks/use-arena-commands';
import { useArenaShortcuts } from '../hooks/use-arena-shortcuts';
import { useDraft } from '../hooks/use-draft';
import { useOfflineLinkGuard } from '../hooks/use-offline-link-guard';
import { ArenaErrorBoundary } from './arena-error-boundary';
import { ArenaHeader } from './arena-header';
import { ArenaProvider } from './arena-provider';
import { Composer, type ComposerPicks } from './composer';
import { EmptyState } from './empty-state';
import { OfflineNotice } from './offline-notice';
import { PromptStarters } from './prompt-starters';
import { ShareDialog } from './share-dialog';
import { ShortcutsDialog } from './shortcuts-dialog';
import { THREAD_LIMIT } from './thread-panel';
import { ThreadSidebar } from './thread-sidebar';
import { ThreadView } from './thread-view';

function ArenaLayout() {
  const api = useApiClient();
  const { threadId, mode, battle, shareThreadId, closeShare, announce } = useArena();
  const online = useOnlineStatus();
  const { setDraft } = useDraft();
  const threads = useQuery(threadsQuery(api, THREAD_LIMIT));
  const heading = useRef<HTMLHeadingElement>(null);
  useArenaCommands(threads.data);
  useArenaShortcuts();
  useOfflineLinkGuard();

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
    battle.send(prompt, {
      mode,
      pair: mode === 'side' ? picks.pair : mode === 'battle' ? lastPair : null,
      directModel: picks.directModel,
    });
    setDraft('');
  };

  const empty = threadId === null && battle.state.turns.length === 0;

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <SkipLink />
      <ArenaHeader />
      <OfflineNotice />
      <div className="flex min-h-0 flex-1">
        <ThreadSidebar />
        <main
          id="main"
          tabIndex={-1}
          data-testid="arena"
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
                  className="pointer-events-none absolute inset-0 dot-grid [mask-image:radial-gradient(ellipse_60%_50%_at_50%_45%,black,transparent)] opacity-70"
                />
                <div className="relative mx-auto grid w-full max-w-3xl gap-8 px-4 py-8 max-md:mt-auto sm:px-6 md:my-auto">
                  <EmptyState headingRef={heading} />
                  <Composer
                    variant="hero"
                    avoidRef={heading}
                    onSend={send}
                    busy={battle.busy}
                    onStop={battle.stop}
                    className="max-md:order-2"
                  />
                  <PromptStarters className="max-md:order-1" />
                </div>
              </>
            ) : (
              <>
                <ThreadView threadId={threadId} />
                <div className="relative mx-auto w-full max-w-3xl px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-linear-to-t from-bg to-transparent"
                  />
                  <Composer onSend={send} busy={battle.busy} onStop={battle.stop} />
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
 * The signed-in arena at `/` (slice S8): the app header, the thread history (a panel on wide
 * screens, a drawer below), and the stage: the empty arena with the composer and the starters,
 * or an open thread (`/?thread=<id>`) with the composer docked under it.
 */
export function ArenaApp() {
  return (
    <ArenaErrorBoundary variant="screen">
      <ArenaProvider>
        <ArenaLayout />
      </ArenaProvider>
    </ArenaErrorBoundary>
  );
}
