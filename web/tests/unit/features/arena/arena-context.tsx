import { type ReactNode, useRef, useState } from 'react';
import { vi } from 'vitest';

import { ArenaContext, type ArenaState } from '@/features/arena/hooks/use-arena';
import type { BattleApi } from '@/features/arena/hooks/use-battle';
import type { LiveTurn } from '@/features/arena/lib/battle-machine';

/** A battle API with no network: the turns given, and spies for every action. */
export function fakeBattle(turns: LiveTurn[] = []): BattleApi {
  return {
    state: { threadId: null, turns },
    busy: false,
    send: vi.fn(),
    vote: vi.fn(),
    stop: vi.fn(),
    showAll: vi.fn(),
    reset: vi.fn(),
    pendingVotes: 0,
  };
}

/**
 * The arena's context for component tests, without the router, the API or storage: fixed values
 * and spies, a real open state for the shortcuts dialog, and `overrides` on top.
 */
export function FakeArena({
  children,
  overrides = {},
}: {
  children: ReactNode;
  overrides?: Partial<ArenaState>;
}) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true);
  const [shortcutsReturnFocus, setShortcutsReturnFocus] = useState<HTMLElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const value: ArenaState = {
    mode: 'battle',
    selectMode: vi.fn(),
    threadId: null,
    thread: undefined,
    openThread: vi.fn(),
    newBattle: vi.fn(),
    rematch: vi.fn(),
    shareThreadId: null,
    openShare: vi.fn(),
    closeShare: vi.fn(),
    sidebarCollapsed: false,
    setSidebarCollapsed: vi.fn(),
    historyOpen: false,
    setHistoryOpen: vi.fn(),
    toggleHistory: vi.fn(),
    wide: true,
    shortcutsEnabled,
    setShortcutsEnabled,
    shortcutsOpen,
    openShortcuts: returnTo => {
      const active = document.activeElement;
      setShortcutsReturnFocus(
        returnTo ?? (active instanceof HTMLElement && active !== document.body ? active : null),
      );
      setShortcutsOpen(true);
    },
    closeShortcuts: () => setShortcutsOpen(false),
    shortcutsReturnFocus,
    composerRef,
    focusComposer: vi.fn(),
    announce: vi.fn(),
    battle: fakeBattle(),
    ...overrides,
  };

  return <ArenaContext.Provider value={value}>{children}</ArenaContext.Provider>;
}
