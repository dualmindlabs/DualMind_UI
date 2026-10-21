import { createContext, type RefObject, useContext } from 'react';

import type { Thread } from '@/lib/api';

import type { ArenaMode } from '../lib/modes';
import type { BattleApi } from './use-battle';

/** The arena's shared state, provided by <ArenaProvider> (components/arena-provider.tsx). */
export interface ArenaState {
  /** The mode on screen: the open thread's, or the one picked for the next battle. */
  mode: ArenaMode;
  /** Picks the mode for the next battle; with a thread open, this starts a new battle. */
  selectMode: (mode: ArenaMode) => void;
  /** The thread in the URL (`/?thread=<id>`), or null for a new battle. */
  threadId: string | null;
  /** The open thread's details once they load (title, mode). */
  thread: Thread | undefined;
  openThread: (threadId: string) => void;
  /** Leaves the thread (if any), clears the prompt and focuses it. */
  newBattle: () => void;
  /** The thread whose share dialog is open, or null (slice S11). */
  shareThreadId: string | null;
  /** Opens the share dialog for a thread (the header, the history menu, the palette). */
  openShare: (threadId: string) => void;
  closeShare: () => void;

  /** Wide screens: the history panel is collapsed to a rail. */
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  /** Small screens: the history drawer is open. */
  historyOpen: boolean;
  setHistoryOpen: (open: boolean) => void;
  /** `[`: collapses or expands the panel on wide screens, opens or closes the drawer below. */
  toggleHistory: () => void;
  /** True from the `lg` breakpoint, where the history is a panel instead of a drawer. */
  wide: boolean;

  /** Single-key shortcuts (N, /, [) are on. */
  shortcutsEnabled: boolean;
  setShortcutsEnabled: (enabled: boolean) => void;

  /** The prompt box, for focus. */
  composerRef: RefObject<HTMLTextAreaElement | null>;
  focusComposer: () => void;
  /** A polite screen-reader message (states, never every word of an answer). */
  announce: (message: string) => void;
  /** The live turns of the open thread: battles, comparisons and chats (useBattle). */
  battle: BattleApi;
}

export const ArenaContext = createContext<ArenaState | null>(null);

export function useArena(): ArenaState {
  const state = useContext(ArenaContext);
  if (!state) throw new Error('useArena() needs <ArenaProvider>.');
  return state;
}
