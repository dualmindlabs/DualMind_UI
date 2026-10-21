import { useQuery } from '@tanstack/react-query';

import { SkipLink } from '@/components/layout/skip-link';
import { toast } from '@/components/ui/sonner';
import { useApiClient } from '@/hooks/use-api-client';
import { threadsQuery } from '@/lib/api';
import { cn } from '@/lib/utils/cn';

import { useArena } from '../hooks/use-arena';
import { useArenaCommands } from '../hooks/use-arena-commands';
import { useArenaShortcuts } from '../hooks/use-arena-shortcuts';
import { ArenaHeader } from './arena-header';
import { ArenaProvider } from './arena-provider';
import { Composer } from './composer';
import { EmptyState } from './empty-state';
import { PromptStarters } from './prompt-starters';
import { THREAD_LIMIT } from './thread-panel';
import { ThreadSidebar } from './thread-sidebar';
import { ThreadView } from './thread-view';

function ArenaLayout() {
  const api = useApiClient();
  const { threadId } = useArena();
  const threads = useQuery(threadsQuery(api, THREAD_LIMIT));
  useArenaCommands(threads.data);
  useArenaShortcuts();

  // Slice S8 builds the shell; the battle flow (slice S9) takes the prompt from here.
  const send = () => {
    toast('Battles in the new arena arrive with the next update', {
      description: 'Your prompt stays in the box. The classic arena runs battles today.',
    });
  };

  const empty = threadId === null;

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
                className="pointer-events-none absolute inset-0 dot-grid opacity-70 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_45%,black,transparent)]"
              />
              <div className="relative mx-auto grid w-full max-w-3xl gap-8 px-4 py-8 sm:px-6">
                <EmptyState />
                <Composer variant="hero" onSend={send} className="max-md:order-2" />
                <PromptStarters className="max-md:order-1" />
              </div>
            </>
          ) : (
            <>
              <ThreadView key={threadId} threadId={threadId} />
              <div className="relative mx-auto w-full max-w-3xl px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-linear-to-t from-bg to-transparent"
                />
                <Composer onSend={send} />
              </div>
            </>
          )}
        </main>
      </div>
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
