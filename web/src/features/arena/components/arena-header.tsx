import { PanelLeft } from 'lucide-react';

import { SiteHeader } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';

import { useArena } from '../hooks/use-arena';
import { AccountMenu } from './account-menu';

/** The app header for the arena: history (below `lg`), the site navigation and the account. */
export function ArenaHeader() {
  const { wide, setHistoryOpen } = useArena();
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
            className="-ml-2"
            onClick={() => setHistoryOpen(true)}
          >
            <PanelLeft aria-hidden="true" strokeWidth={1.75} />
          </Button>
        )
      }
      account={<AccountMenu />}
    />
  );
}
