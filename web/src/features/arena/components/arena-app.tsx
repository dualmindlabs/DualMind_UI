import { useQuery } from '@tanstack/react-query';

import { SkipLink } from '@/components/layout/skip-link';
import { useApiClient } from '@/hooks/use-api-client';
import { threadsQuery } from '@/lib/api';
import { cn } from '@/lib/utils/cn';

import { useArena } from '../hooks/use-arena';
import { useArenaCommands } from '../hooks/use-arena-commands';
import { useArenaShortcuts } from '../hooks/use-arena-shortcuts';
import { useDraft } from '../hooks/use-draft';
import { ArenaHeader } from './arena-header';
import { ArenaProvider } from './arena-provider';
import { Composer, type ComposerPicks } from './composer';
import { EmptyState } from './empty-state';
import { PromptStarters } from './prompt-starters';
import { ShareDialog } from './share-dialog';
import { THREAD_LIMIT } from './thread-panel';
import { ThreadSidebar } from './thread-sidebar';
import { ThreadView } from './thread-view';

function ArenaLayout() {
  const api = useApiClient();
  const { threadId, mode, battle, shareThreadId, closeShare } = useArena();
  const { setDraft } = useDraft();
  const threads = useQuery(threadsQuery(api, THREAD_LIMIT));
  useArenaCommands(threads.data);
  useArenaShortcuts();

  const send = (prompt: string, picks: ComposerPicks) => {
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
      <div className="flex min-h-0 flex-1">
        <ThreadSidebar />
        <main
          id="main"
          tabIndex={-1}
          data-testid="arena"
          className={cn(
            'relative flex min-w-0 flex-1 flex-col outline-none',
            empty && 'justify-end overflow-y-auto md:justify-center',
          )}
        >
          {empty ? (
            <>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 dot-grid [mask-image:radial-gradient(ellipse_60%_50%_at_50%_45%,black,transparent)] opacity-70"
              />
              <div className="relative mx-auto grid w-full max-w-3xl gap-8 px-4 py-8 sm:px-6">
                <EmptyState />
                <Composer
                  variant="hero"
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
        </main>
      </div>
      <ShareDialog threadId={shareThreadId} onClose={closeShare} />
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
    <ArenaProvider>
      <ArenaLayout />
    </ArenaProvider>
  );
}
