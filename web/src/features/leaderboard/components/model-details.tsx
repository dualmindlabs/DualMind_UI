import { ArrowRight, Swords } from 'lucide-react';
import type { RefObject } from 'react';

import { buttonVariants } from '@/components/ui/button';
import {
  Drawer,
  DrawerCloseButton,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { ModelMark } from '@/components/ui/model-mark';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils/cn';

import { TABLE_QUERY, useMediaQuery } from '../hooks/use-media-query';
import { ARENA_HREF, RATINGS_HELP_HREF } from '../lib/constants';
import { formatRank } from '../lib/format';
import type { Movement } from '../lib/movement';
import type { Leaderboard } from '../types';
import { ModelDetailsBody } from './model-details-body';
import { ProviderBadge } from './provider-badge';

export interface ModelDetailsProps {
  board: Leaderboard | undefined;
  selectedId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Gets focus back when the sheet closes (the row or card that opened it). */
  returnFocusRef: RefObject<HTMLElement | null>;
  /** Which page opened it: each links to the other. */
  from: 'leaderboard' | 'models';
  /** How the selected model's rank moved since the visitor's last visit. */
  movement?: ReadonlyMap<string, Movement> | undefined;
}

function Links({ from }: { from: ModelDetailsProps['from'] }) {
  const other =
    from === 'leaderboard'
      ? { href: '/models/', label: 'Browse all models' }
      : { href: '/leaderboard/', label: 'See the leaderboard' };
  return (
    <>
      <a href={ARENA_HREF} className={cn(buttonVariants({ variant: 'primary', size: 'sm' }))}>
        <Swords aria-hidden="true" strokeWidth={1.75} />
        Start a battle
      </a>
      <a
        href={RATINGS_HELP_HREF}
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
      >
        How ratings work
      </a>
      <a href={other.href} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
        {other.label}
        <ArrowRight aria-hidden="true" strokeWidth={1.75} />
      </a>
    </>
  );
}

/**
 * The model details: a side sheet from `md` up, a bottom drawer (swipe down to close) on phones.
 * Both trap focus, close on Esc and return focus to the row or card that opened them. Shared by
 * the leaderboard and the models page.
 */
export function ModelDetails({
  board,
  selectedId,
  open,
  onOpenChange,
  returnFocusRef,
  from,
  movement,
}: ModelDetailsProps) {
  const wide = useMediaQuery(TABLE_QUERY);
  const entry = board?.entries.find(item => item.id === selectedId);
  if (!board || !entry) return null;

  const eyebrow = (
    <p className="flex flex-wrap items-center gap-2">
      <span className={entry.rank === null ? 'eyebrow text-warn' : 'eyebrow text-mind-a'}>
        {entry.rank === null
          ? 'Not yet rated'
          : `Rank ${formatRank(entry.rank)} of ${board.summary.rated}`}
      </span>
      <ProviderBadge label={entry.providerLabel} via={entry.servedBy} />
    </p>
  );

  if (wide) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          finalFocus={returnFocusRef}
          className="data-[side=right]:w-[min(100%_-_2rem,32rem)]"
        >
          <SheetHeader className="gap-3">
            {eyebrow}
            <div className="flex items-center gap-3.5">
              <ModelMark name={entry.providerLabel} size="lg" />
              <SheetTitle className="text-h2 break-words">{entry.name}</SheetTitle>
            </div>
            <SheetDescription className="font-code break-all">
              <span className="sr-only">Model id: </span>
              {entry.modelName}
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="pb-2">
            <ModelDetailsBody entry={entry} board={board} movement={movement?.get(entry.id)} />
          </SheetBody>
          <SheetFooter className="flex-wrap sm:justify-start">
            <Links from={from} />
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent finalFocus={returnFocusRef}>
        <DrawerHeader className="gap-2.5">
          <div className="flex items-start justify-between gap-3">
            {eyebrow}
            <DrawerCloseButton className="-mt-1 -mr-2 shrink-0" />
          </div>
          <div className="flex items-center gap-3">
            <ModelMark name={entry.providerLabel} size="md" />
            <DrawerTitle className="text-h3 break-words">{entry.name}</DrawerTitle>
          </div>
          <DrawerDescription className="font-code break-all">
            <span className="sr-only">Model id: </span>
            {entry.modelName}
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-5 pb-2">
          <ModelDetailsBody entry={entry} board={board} movement={movement?.get(entry.id)} />
        </div>
        <DrawerFooter>
          <Links from={from} />
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
