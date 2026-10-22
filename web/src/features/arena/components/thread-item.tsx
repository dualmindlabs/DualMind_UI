import { Ellipsis, MessageSquareText, Pencil, Scale, Share2, Swords, Trash } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Thread } from '@/lib/api';
import { cn } from '@/lib/utils/cn';

const MODE_ICON = { battle: Swords, arena: Scale, direct: MessageSquareText } as const;

export interface ThreadItemProps {
  thread: Thread;
  active: boolean;
  time: string;
  onOpen: (threadId: string) => void;
  onRename: (thread: Thread) => void;
  onShare: (threadId: string) => void;
  onDelete: (thread: Thread) => void;
}

/**
 * One thread in the history: a real link (`/?thread=<id>`, so it opens in a new tab too) and a
 * menu with rename, share and delete. The open thread is marked with `aria-current`. In the wide
 * panel the time sits at the end of the row (and gives way to the menu on hover); in the drawer
 * it sits under the title (UI audit P2-9).
 */
export function ThreadItem({
  thread,
  active,
  time,
  onOpen,
  onRename,
  onShare,
  onDelete,
}: ThreadItemProps) {
  const Icon = MODE_ICON[thread.mode];
  return (
    <li className="group/item relative min-w-0">
      <a
        href={`/?thread=${encodeURIComponent(thread.threadId)}`}
        aria-current={active ? 'page' : undefined}
        onClick={event => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
          event.preventDefault();
          onOpen(thread.threadId);
        }}
        className={cn(
          'relative flex min-h-10 items-center gap-2.5 rounded-md py-2 pr-10 pl-9 text-ui-sm text-fg-soft transition-colors duration-(--dur-fast) ease-out-expo hover:bg-hover hover:text-fg active:bg-pressed pointer-coarse:min-h-11',
          'focus-visible:-outline-offset-2 aria-[current=page]:bg-surface-3 aria-[current=page]:text-fg',
          // The open thread carries the duel's two colours down its left edge.
          'aria-[current=page]:before:absolute aria-[current=page]:before:inset-y-2 aria-[current=page]:before:left-0 aria-[current=page]:before:w-0.5 aria-[current=page]:before:rounded-full aria-[current=page]:before:bg-linear-to-b aria-[current=page]:before:from-mind-a aria-[current=page]:before:to-mind-b',
          // The drawer (below lg) is narrow: the title gets the whole row (two lines at most) and
          // the time moves under it, instead of clipping the title at a few words.
          'max-lg:flex-col max-lg:items-start max-lg:gap-0.5',
        )}
      >
        <Icon
          aria-hidden="true"
          className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
          strokeWidth={1.5}
        />
        <span className="min-w-0 flex-1 truncate max-lg:line-clamp-2 max-lg:w-full max-lg:flex-none max-lg:whitespace-normal">
          {thread.title}
        </span>
        <span
          data-testid="thread-time"
          className="shrink-0 font-mono text-caption text-muted tabular-nums transition-opacity lg:group-focus-within/item:opacity-0 lg:group-hover/item:opacity-0"
        >
          {time}
        </span>
      </a>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${thread.title}`}
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'icon-xs' }),
            'absolute top-1/2 right-1.5 -translate-y-1/2 opacity-0 group-focus-within/item:opacity-100 group-hover/item:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100 pointer-coarse:opacity-100',
          )}
        >
          <Ellipsis aria-hidden="true" strokeWidth={1.75} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuItem onClick={() => onRename(thread)}>
            <Pencil aria-hidden="true" strokeWidth={1.75} />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onShare(thread.threadId)}>
            <Share2 aria-hidden="true" strokeWidth={1.75} />
            Share
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => onDelete(thread)}>
            <Trash aria-hidden="true" strokeWidth={1.75} />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
