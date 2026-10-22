import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

import { useApiClient } from '@/hooks/use-api-client';
import { useMediaQuery } from '@/hooks/use-media-query';
import { threadQuery } from '@/lib/api';
import { clearPromptDraft, readPromptDraft } from '@/lib/session/prompt-draft';

import { ArenaContext, type ArenaState } from '../hooks/use-arena';
import { useBattle } from '../hooks/use-battle';
import { DraftContext, type DraftState } from '../hooks/use-draft';
import { useStoredValue } from '../hooks/use-stored-value';
import { type ArenaMode, isArenaMode, modeFromThread } from '../lib/modes';
import { ARENA_PREFERENCE_KEYS, WIDE_QUERY } from '../lib/preferences';

/**
 * The arena's state for every part of the screen: the mode, the open thread (from `?thread=`),
 * the history panel or drawer, the shortcuts and their dialog, the prompt draft and a polite live
 * region.
 * Preferences live in localStorage, so they survive reloads and stay in step across tabs.
 */
export function ArenaProvider({ children }: { children: ReactNode }) {
  const api = useApiClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const threadId = searchParams.get('thread')?.trim() || null;
  const wide = useMediaQuery(WIDE_QUERY, true);

  const [storedMode, setStoredMode] = useStoredValue(ARENA_PREFERENCE_KEYS.mode);
  const [storedSidebar, setStoredSidebar] = useStoredValue(ARENA_PREFERENCE_KEYS.sidebar);
  const [storedShortcuts, setStoredShortcuts] = useStoredValue(ARENA_PREFERENCE_KEYS.shortcuts);
  const selectedMode: ArenaMode = isArenaMode(storedMode) ? storedMode : 'battle';
  const sidebarCollapsed = storedSidebar === 'collapsed';
  const shortcutsEnabled = storedShortcuts !== 'off';

  const [historyOpen, setHistoryOpen] = useState(false);
  const [shareThreadId, setShareThreadId] = useState<string | null>(null);
  // A prompt typed on the landing page before signing in (UI audit P1-1): it opens in the box,
  // focused and not sent. Read once; the effect below clears it from the tab.
  const [landingDraft] = useState(() => readPromptDraft());
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [shortcutsReturnFocus, setShortcutsReturnFocus] = useState<HTMLElement | null>(null);
  const [draft, setDraft] = useState(landingDraft ?? '');
  const [announcement, setAnnouncement] = useState({ id: 0, message: '' });
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const { data: thread } = useQuery({
    ...threadQuery(api, threadId ?? ''),
    enabled: threadId !== null,
  });
  const openThreadData = threadId !== null && thread?.threadId === threadId ? thread : undefined;
  const mode = openThreadData ? modeFromThread(openThreadData.mode) : selectedMode;

  // `?arena=new` did its job in the head script (it stored the choice); keep the address clean.
  useEffect(() => {
    if (!searchParams.has('arena')) return;
    setSearchParams(
      params => {
        params.delete('arena');
        return params;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

  const announce = useCallback(
    (message: string) => {
      setAnnouncement(current => ({ id: current.id + 1, message }));
    },
    [setAnnouncement],
  );

  // A thread created by the first prompt goes into the address, so a reload keeps it.
  const onThreadCreated = useCallback(
    (id: string) =>
      setSearchParams(
        params => {
          params.set('thread', id);
          return params;
        },
        { replace: true },
      ),
    [setSearchParams],
  );
  const battle = useBattle({ threadId, onThreadCreated, announce });
  const { reset: resetBattle, state: battleState } = battle;

  // Another thread in the address (history, Back, Forward): its live turns start empty.
  useEffect(() => {
    if (threadId !== null && threadId !== battleState.threadId) resetBattle(threadId);
  }, [threadId, battleState.threadId, resetBattle]);

  const focusComposer = useCallback(() => {
    // After the current render: the composer may be about to move (empty state to thread).
    requestAnimationFrame(() => composerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (landingDraft === null) return;
    clearPromptDraft();
    focusComposer();
    const frame = requestAnimationFrame(() =>
      announce('Your prompt from the home page is in the box. Send it when you are ready.'),
    );
    return () => cancelAnimationFrame(frame);
  }, [landingDraft, focusComposer, announce]);

  const openThread = useCallback(
    (id: string) => {
      setHistoryOpen(false);
      resetBattle(id);
      setSearchParams(params => {
        params.set('thread', id);
        return params;
      });
    },
    [setSearchParams, resetBattle, setHistoryOpen],
  );

  const newBattle = useCallback(() => {
    setHistoryOpen(false);
    resetBattle(null);
    setDraft('');
    setSearchParams(params => {
      params.delete('thread');
      return params;
    });
    focusComposer();
  }, [setSearchParams, focusComposer, resetBattle, setHistoryOpen, setDraft]);

  const rematch = useCallback(
    (prompt: string) => {
      setStoredMode('battle');
      setHistoryOpen(false);
      resetBattle(null);
      setDraft(prompt);
      setSearchParams(params => {
        params.delete('thread');
        return params;
      });
      focusComposer();
      announce('A new battle with the same prompt is ready. Send it to meet two other models.');
    },
    [
      setStoredMode,
      setSearchParams,
      focusComposer,
      resetBattle,
      setHistoryOpen,
      setDraft,
      announce,
    ],
  );

  const selectMode = useCallback(
    (next: ArenaMode) => {
      setStoredMode(next);
      // Another mode is another conversation: leave the open thread for a new one.
      if ((threadId !== null || battleState.turns.length > 0) && next !== mode) {
        resetBattle(null);
        setSearchParams(params => {
          params.delete('thread');
          return params;
        });
      }
    },
    [setStoredMode, threadId, mode, setSearchParams, resetBattle, battleState.turns.length],
  );

  const openShare = useCallback(
    (id: string) => {
      setHistoryOpen(false);
      setShareThreadId(id);
    },
    [setHistoryOpen, setShareThreadId],
  );
  const closeShare = useCallback(() => setShareThreadId(null), [setShareThreadId]);

  const setSidebarCollapsed = useCallback(
    (collapsed: boolean) => setStoredSidebar(collapsed ? 'collapsed' : null),
    [setStoredSidebar],
  );

  const toggleHistory = useCallback(() => {
    if (wide) setSidebarCollapsed(!sidebarCollapsed);
    else setHistoryOpen(open => !open);
  }, [wide, sidebarCollapsed, setSidebarCollapsed, setHistoryOpen]);

  const openShortcuts = useCallback(
    (returnTo?: HTMLElement | null) => {
      // From a key press: focus returns to what had it. From the account menu: to its trigger.
      // Anything gone by then (the palette's field) falls back to the dialog's default.
      const active = document.activeElement;
      setShortcutsReturnFocus(
        returnTo ?? (active instanceof HTMLElement && active !== document.body ? active : null),
      );
      setHistoryOpen(false);
      setShortcutsOpen(true);
    },
    [setHistoryOpen, setShortcutsOpen, setShortcutsReturnFocus],
  );
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), [setShortcutsOpen]);

  const setShortcutsEnabled = useCallback(
    (enabled: boolean) => setStoredShortcuts(enabled ? null : 'off'),
    [setStoredShortcuts],
  );

  // The tab title follows the open thread.
  useEffect(() => {
    document.title = openThreadData
      ? `${openThreadData.title} · DualMind Arena`
      : 'Arena · DualMind Arena';
  }, [openThreadData]);

  const value = useMemo<ArenaState>(
    () => ({
      mode,
      selectMode,
      threadId,
      thread: openThreadData,
      openThread,
      newBattle,
      rematch,
      shareThreadId,
      openShare,
      closeShare,
      sidebarCollapsed,
      setSidebarCollapsed,
      historyOpen,
      setHistoryOpen,
      toggleHistory,
      wide,
      shortcutsEnabled,
      setShortcutsEnabled,
      shortcutsOpen,
      openShortcuts,
      closeShortcuts,
      shortcutsReturnFocus,
      composerRef,
      focusComposer,
      announce,
      battle,
    }),
    [
      mode,
      selectMode,
      threadId,
      openThreadData,
      openThread,
      newBattle,
      rematch,
      shareThreadId,
      openShare,
      closeShare,
      sidebarCollapsed,
      setSidebarCollapsed,
      historyOpen,
      toggleHistory,
      wide,
      shortcutsEnabled,
      setShortcutsEnabled,
      shortcutsOpen,
      openShortcuts,
      closeShortcuts,
      shortcutsReturnFocus,
      focusComposer,
      announce,
      battle,
      setHistoryOpen,
    ],
  );

  const draftValue = useMemo<DraftState>(() => ({ draft, setDraft }), [draft, setDraft]);

  return (
    <ArenaContext.Provider value={value}>
      <DraftContext.Provider value={draftValue}>
        {children}
        <p className="sr-only" aria-live="polite" aria-atomic="true" data-testid="arena-announcer">
          <span key={announcement.id}>{announcement.message}</span>
        </p>
      </DraftContext.Provider>
    </ArenaContext.Provider>
  );
}
