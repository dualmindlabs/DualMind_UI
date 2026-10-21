import { useEffect } from 'react';

import { turnAwaitingVote } from '../lib/battle-machine';
import { singleKeyAction } from '../lib/shortcuts';
import { useArena } from './use-arena';

/**
 * The single-key shortcuts (?, N, / and [, and 1 to 4 while a vote is open), only outside text
 * fields and only while they are on. Dialogs and menus handle their own keys: while one is open
 * (`aria-modal` content or an open menu) nothing fires here.
 */
export function useArenaShortcuts(): void {
  const { shortcutsEnabled, newBattle, toggleHistory, focusComposer, openShortcuts, battle } =
    useArena();
  const { state, vote } = battle;

  useEffect(() => {
    if (!shortcutsEnabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const action = singleKeyAction(event);
      if (action === null) return;
      if (document.querySelector('[aria-modal="true"], [role="menu"]')) return;
      if (action.startsWith('vote-')) {
        const turn = turnAwaitingVote(state);
        if (!turn) return;
        event.preventDefault();
        vote(turn.id, action.slice('vote-'.length) as 'left' | 'right' | 'tie' | 'both-bad');
        return;
      }
      event.preventDefault();
      switch (action) {
        case 'show-shortcuts':
          openShortcuts();
          break;
        case 'new-battle':
          newBattle();
          break;
        case 'toggle-sidebar':
          toggleHistory();
          break;
        case 'focus-composer':
          focusComposer();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shortcutsEnabled, newBattle, toggleHistory, focusComposer, openShortcuts, state, vote]);
}
