import { useQuery } from '@tanstack/react-query';
import { MessagesSquare, Plus, RotateCw, Search } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient } from '@/hooks/use-api-client';
import { getUserMessage, type Thread, threadsQuery } from '@/lib/api';

import { useArena } from '../hooks/use-arena';
import { useNow } from '../hooks/use-now';
import { filterThreads, formatThreadTime, groupThreads, threadTime } from '../lib/thread-groups';
import { ThreadDialogs } from './thread-dialogs';
import { ThreadItem } from './thread-item';

/** How many threads the history asks for (the API has no paging yet; its maximum is 100). */
export const THREAD_LIMIT = 50;

/**
 * The history: New battle, a search over titles, then the threads grouped by day (Today,
 * Yesterday, Last 7 days, Older) with rename, share and delete. Shared by the wide-screen panel and the
 * phone drawer.
 */
export function ThreadPanel() {
  const api = useApiClient();
  const { threadId, openThread, newBattle, openShare } = useArena();
  const threads = useQuery(threadsQuery(api, THREAD_LIMIT));
  const now = useNow();
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const [renaming, setRenaming] = useState<Thread | null>(null);
  const [deleting, setDeleting] = useState<Thread | null>(null);

  const groups = useMemo(
    () => (threads.data ? groupThreads(filterThreads(threads.data, deferred), now) : undefined),
    [threads.data, deferred, now],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid gap-2 px-3 pt-3 pb-2">
        <Button variant="primary" size="sm" onClick={newBattle} className="justify-between">
          <span className="flex items-center gap-2">
            <Plus aria-hidden="true" strokeWidth={1.75} />
            New battle
          </span>
          <Kbd aria-hidden="true">N</Kbd>
        </Button>
        <label className="relative block">
          <span className="sr-only">Search your threads</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
            strokeWidth={1.75}
          />
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search threads"
            className="h-9 w-full rounded-md border border-line bg-bg-deep pr-3 pl-9 text-ui-sm text-fg placeholder:text-muted hover:border-line-strong pointer-coarse:h-11"
          />
        </label>
      </div>
      <nav aria-label="Your threads" className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {threads.isPending ? (
          <div aria-busy="true" className="grid gap-2 pt-2">
            <p className="sr-only">Loading your threads</p>
            {[72, 56, 64, 48, 60].map(width => (
              <Skeleton key={width} className="h-8" style={{ width: `${width + 24}%` }} />
            ))}
          </div>
        ) : threads.isError ? (
          <div className="grid gap-2 px-1 pt-3 text-ui-sm" role="alert">
            <p className="text-fg-soft">{getUserMessage(threads.error)}</p>
            <Button
              variant="outline"
              size="xs"
              className="justify-self-start"
              onClick={() => void threads.refetch()}
            >
              <RotateCw aria-hidden="true" strokeWidth={1.75} />
              Try again
            </Button>
          </div>
        ) : groups && groups.length > 0 ? (
          groups.map(group => (
            <section key={group.id} aria-labelledby={`threads-${group.id}`} className="pt-3">
              <h3 id={`threads-${group.id}`} className="px-3 pb-1.5 eyebrow text-muted">
                {group.label}
              </h3>
              <ul className="grid gap-0.5">
                {group.threads.map(thread => (
                  <ThreadItem
                    key={thread.threadId}
                    thread={thread}
                    active={thread.threadId === threadId}
                    time={formatThreadTime(threadTime(thread), now)}
                    onOpen={openThread}
                    onRename={setRenaming}
                    onShare={openShare}
                    onDelete={setDeleting}
                  />
                ))}
              </ul>
            </section>
          ))
        ) : query.trim() !== '' ? (
          <p className="px-3 pt-4 text-ui-sm text-muted">No thread matches “{query.trim()}”.</p>
        ) : (
          <div className="grid justify-items-start gap-2 px-3 pt-4">
            <MessagesSquare aria-hidden="true" className="size-5 text-muted" strokeWidth={1.5} />
            <p className="text-ui-sm text-fg-soft">No threads yet.</p>
            <p className="text-caption text-muted">Your battles and chats appear here.</p>
          </div>
        )}
      </nav>
      <ThreadDialogs
        renaming={renaming}
        deleting={deleting}
        onClose={() => {
          setRenaming(null);
          setDeleting(null);
        }}
        onDeleted={deletedId => {
          if (deletedId === threadId) newBattle();
        }}
      />
    </div>
  );
}
