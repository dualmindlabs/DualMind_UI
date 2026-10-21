import { useEffect } from 'react';

import { singleKeyAction } from '../lib/shortcuts';
import { useArena } from './use-arena';

/**
 * The single-key shortcuts (N, / and [), only outside text fields and only while they are on.
 * Dialogs and menus handle their own keys: while one is open (`aria-modal` content or an open
 * menu) nothing fires here.
 */
export function useArenaShortcuts(): void {
  const { shortcutsEnabled, newBattle, toggleHistory, focusComposer } = useArena();

  useEffect(() => {
    if (!shortcutsEnabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const action = singleKeyAction(event);
      if (action === null) return;
      if (document.querySelector('[aria-modal="true"], [role="menu"]')) return;
      event.preventDefault();
      switch (action) {
        case 'new-battle':
          newBattle();
          break;
        case 'toggle-sidebar':
          toggleHistory();
          break;
        case 'focus-composer':
          focusComposer();
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shortcutsEnabled, newBattle, toggleHistory, focusComposer]);
}
