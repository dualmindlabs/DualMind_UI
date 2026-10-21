import { Ellipsis, Pencil, Trash } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Thread } from '@/lib/api';
import { cn } from '@/lib/utils/cn';

export interface ThreadItemProps {
  thread: Thread;
  active: boolean;
  time: string;
  onOpen: (threadId: string) => void;
  onRename: (thread: Thread) => void;
  onDelete: (thread: Thread) => void;
}

/**
 * One thread in the history: a real link (`/?thread=<id>`, so it opens in a new tab too) and a
 * menu with rename and delete. The open thread is marked with `aria-current`.
 */
export function ThreadItem({ thread, active, time, onOpen, onRename, onDelete }: ThreadItemProps) {
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
          'flex min-h-10 items-center gap-2 rounded-md py-2 pr-10 pl-3 text-ui-sm text-fg-soft transition-colors duration-(--dur-fast) ease-out-expo hover:bg-hover hover:text-fg pointer-coarse:min-h-11',
          'focus-visible:-outline-offset-2 aria-[current=page]:bg-surface-3 aria-[current=page]:text-fg',
        )}
      >
        <span className="min-w-0 flex-1 truncate">{thread.title}</span>
        <span className="shrink-0 font-mono text-caption text-muted tabular-nums transition-opacity group-focus-within/item:opacity-0 group-hover/item:opacity-0">
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
          <DropdownMenuItem variant="destructive" onClick={() => onDelete(thread)}>
            <Trash aria-hidden="true" strokeWidth={1.75} />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
