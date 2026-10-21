import { useQuery } from '@tanstack/react-query';
import { RotateCw, SearchX } from 'lucide-react';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChatContainerContent,
  ChatContainerRoot,
} from '@/components/vendor/prompt-kit/chat-container';
import { ScrollButton } from '@/components/vendor/prompt-kit/scroll-button';
import { useApiClient } from '@/hooks/use-api-client';
import { getUserMessage, isApiErrorKind, threadMessagesQuery } from '@/lib/api';
import { cn } from '@/lib/utils/cn';

import { useArena } from '../hooks/use-arena';
import { useModelOptions } from '../hooks/use-model-options';
import { useNow } from '../hooks/use-now';
import { MODE_DETAILS } from '../lib/modes';
import { formatThreadTime, threadTime } from '../lib/thread-groups';
import { toTurns } from '../lib/turns';
import { LiveTurnView } from './live-turn-view';
import { TurnView } from './turn-view';

function TurnSkeleton() {
  return (
    <div className="grid gap-4" aria-hidden="true">
      <div className="grid gap-2 border-l-2 border-line pl-4">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map(index => (
          <div key={index} className="overflow-hidden rounded-lg border border-line">
            <Skeleton className="h-12 rounded-none" />
            <div className="grid gap-2.5 p-5">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-11/12" />
              <Skeleton className="h-3.5 w-4/5" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThreadMessage({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: { label: string; onClick: () => void; icon?: typeof RotateCw };
}) {
  const Icon = action.icon;
  return (
    <div className="mx-auto grid max-w-md justify-items-center gap-3 px-6 py-16 text-center">
      <SearchX aria-hidden="true" className="size-8 text-muted" strokeWidth={1.5} />
      <h1 className="text-h3 font-semibold text-fg">{title}</h1>
      <p className="text-ui text-fg-soft">{body}</p>
      <Button variant="secondary" size="sm" onClick={action.onClick} className="mt-2">
        {Icon ? <Icon aria-hidden="true" strokeWidth={1.75} /> : null}
        {action.label}
      </Button>
    </div>
  );
}

/**
 * An open thread (`/?thread=<id>`): its title, then every turn, oldest first, in a container that
 * sticks to the newest content. Loading, missing and failed threads each get their own state.
 */
export function ThreadView({ threadId }: { threadId: string | null }) {
  const api = useApiClient();
  const { thread, mode, newBattle, battle } = useArena();
  const messages = useQuery({
    ...threadMessagesQuery(api, threadId ?? ''),
    enabled: threadId !== null,
  });
  const live = battle.state.threadId === threadId ? battle.state.turns : [];
  const { options } = useModelOptions();
  const now = useNow();

  const names = useMemo(
    () => new Map((options ?? []).map(option => [option.modelName, option.displayName])),
    [options],
  );
  // A turn of this session that the server already stores shows once: as the live turn.
  const turns = useMemo(() => {
    if (!messages.data) return undefined;
    const liveIds = new Set(live.map(turn => turn.comparisonId).filter(Boolean));
    return toTurns(messages.data, mode).filter(
      turn => turn.comparisonId === null || !liveIds.has(turn.comparisonId),
    );
  }, [messages.data, mode, live]);

  if (threadId !== null && messages.isError) {
    const missing = isApiErrorKind(messages.error, 'not_found', 'forbidden');
    return missing ? (
      <ThreadMessage
        title="This thread is not here"
        body="It may have been deleted, or it belongs to another account."
        action={{ label: 'Start a new battle', onClick: newBattle }}
      />
    ) : (
      <ThreadMessage
        title="The thread did not load"
        body={getUserMessage(messages.error)}
        action={{ label: 'Try again', onClick: () => void messages.refetch(), icon: RotateCw }}
      />
    );
  }

  const time = thread ? threadTime(thread) : null;
  const wide = mode !== 'direct';

  return (
    <ChatContainerRoot className="min-h-0 flex-1">
      <ChatContainerContent
        scrollClassName="overscroll-contain"
        className={cn(
          'mx-auto w-full gap-10 px-4 pt-6 pb-10 sm:px-6',
          wide ? 'max-w-6xl' : 'max-w-3xl',
        )}
      >
        <header className="grid gap-1.5">
          <p className="eyebrow text-muted">
            {MODE_DETAILS[mode].label}
            {thread ? (
              <span className="text-muted">
                {' · '}
                {thread.messageCount} {thread.messageCount === 1 ? 'turn' : 'turns'}
                {time === null ? null : ` · ${formatThreadTime(time, now)}`}
              </span>
            ) : null}
          </p>
          {thread || threadId === null ? (
            <h1 className="text-h3 font-semibold text-balance text-fg sm:text-h2">
              {thread?.title ?? live[0]?.prompt ?? 'New battle'}
            </h1>
          ) : (
            <Skeleton className="h-8 w-2/3" />
          )}
        </header>
        {threadId === null ? null : turns === undefined ? (
          <div aria-busy="true" className="grid gap-10">
            <p className="sr-only">Loading the thread</p>
            <TurnSkeleton />
          </div>
        ) : turns.length === 0 && live.length === 0 ? (
          <p className="text-ui text-fg-soft">
            This thread has no answers yet. Send a prompt below to start it.
          </p>
        ) : (
          turns.map(turn => <TurnView key={turn.id} turn={turn} names={names} />)
        )}
        {live.map((turn, index) => (
          <LiveTurnView key={turn.id} turn={turn} number={(turns?.length ?? 0) + index + 1} />
        ))}
      </ChatContainerContent>
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <ScrollButton className="pointer-events-auto" label="Scroll to the latest answer" />
      </div>
    </ChatContainerRoot>
  );
}
