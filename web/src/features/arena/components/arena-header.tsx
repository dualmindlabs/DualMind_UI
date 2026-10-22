import { PanelLeft, Plus } from 'lucide-react';

import { SiteHeader } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';

import { useArena } from '../hooks/use-arena';
import { AccountMenu } from './account-menu';

/**
 * The app header for the arena: the history button (whenever the history is not docked beside
 * the stage), the site navigation, New battle once a battle is on, and the account.
 */
export function ArenaHeader({ staged = false }: { staged?: boolean }) {
  const { wide, setHistoryOpen, newBattle } = useArena();
  return (
    <SiteHeader
      variant="app"
      activePath="/"
      leading={
        wide ? null : (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Open the history"
            aria-keyshortcuts="["
            className="-ml-2"
            onClick={() => setHistoryOpen(true)}
          >
            <PanelLeft aria-hidden="true" strokeWidth={1.75} />
          </Button>
        )
      }
      account={
        <>
          {staged ? (
            <Button
              variant="outline"
              size="sm"
              aria-label="New battle"
              aria-keyshortcuts="N"
              className="rounded-full max-sm:size-9 max-sm:px-0"
              onClick={newBattle}
            >
              <Plus aria-hidden="true" strokeWidth={1.75} />
              <span className="max-sm:hidden">New battle</span>
              <Kbd aria-hidden="true" className="h-5 min-w-5 max-lg:hidden">
                N
              </Kbd>
            </Button>
          ) : null}
          <AccountMenu />
        </>
      }
    />
  );
}
