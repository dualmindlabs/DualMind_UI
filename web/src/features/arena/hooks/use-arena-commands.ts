import {
  ArrowLeftRight,
  History,
  type LucideIcon,
  MessageSquare,
  MessagesSquare,
  PanelLeft,
  Plus,
  Swords,
  Undo2,
} from 'lucide-react';
import { useMemo } from 'react';

import { type CommandGroupDefinition, useCommandPaletteGroup } from '@/hooks/use-command-palette';
import type { Thread } from '@/lib/api';

import { leaveForClassicArena } from '../lib/classic-arena';
import { ARENA_MODES, type ArenaMode, MODE_DETAILS } from '../lib/modes';
import { useArena } from './use-arena';

const MODE_ICONS: Record<ArenaMode, LucideIcon> = {
  battle: Swords,
  side: ArrowLeftRight,
  direct: MessageSquare,
};

/** "Open: <title>", numbered when two threads share a title (the palette matches on labels). */
function uniqueLabels(threads: readonly Thread[]): Array<{ thread: Thread; label: string }> {
  const seen = new Map<string, number>();
  return threads.map(thread => {
    const base = `Open: ${thread.title}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return { thread, label: count === 1 ? base : `${base} (${count})` };
  });
}

/** How many threads the palette lists ("Open: ..."); the sidebar search finds the rest. */
const PALETTE_THREADS = 12;

/**
 * The arena's commands in the palette (Ctrl+K or Cmd+K, new-features.md F-1): new battle,
 * switch mode, jump to a recent thread, the history, and the way back to the classic arena.
 */
export function useArenaCommands(threads: readonly Thread[] | undefined): void {
  const { newBattle, selectMode, mode, openThread, toggleHistory, wide } = useArena();

  const arenaGroup = useMemo<CommandGroupDefinition>(
    () => ({
      id: 'arena',
      heading: 'Arena',
      actions: [
        {
          id: 'arena-new',
          label: 'New battle',
          keywords: ['start', 'fresh', 'clear', 'prompt'],
          icon: Plus,
          hint: 'N',
          perform: newBattle,
        },
        ...ARENA_MODES.filter(item => item !== mode).map(item => ({
          id: `arena-mode-${item}`,
          label: `Switch to ${MODE_DETAILS[item].label}`,
          keywords: ['mode', item, MODE_DETAILS[item].description],
          icon: MODE_ICONS[item],
          perform: () => selectMode(item),
        })),
        {
          id: 'arena-history',
          label: wide ? 'Show or hide the history' : 'Open the history',
          keywords: ['sidebar', 'threads', 'conversations', 'past'],
          icon: PanelLeft,
          hint: '[',
          perform: toggleHistory,
        },
        {
          id: 'arena-classic',
          label: 'Open the classic arena',
          keywords: ['legacy', 'old', 'previous', 'back'],
          icon: Undo2,
          perform: leaveForClassicArena,
        },
      ],
    }),
    [newBattle, mode, selectMode, wide, toggleHistory],
  );

  const threadGroup = useMemo<CommandGroupDefinition | null>(
    () =>
      threads === undefined || threads.length === 0
        ? null
        : {
            id: 'arena-threads',
            heading: 'Recent threads',
            actions: uniqueLabels(threads.slice(0, PALETTE_THREADS)).map(({ thread, label }) => ({
              id: `arena-thread-${thread.threadId}`,
              label,
              keywords: ['thread', 'history', 'conversation', thread.mode],
              icon: thread.mode === 'direct' ? MessagesSquare : History,
              perform: () => openThread(thread.threadId),
            })),
          },
    [threads, openThread],
  );

  useCommandPaletteGroup(arenaGroup);
  useCommandPaletteGroup(threadGroup);
}
