import { History as HistoryIcon, PanelLeftClose, PanelLeftOpen, Plus, Search } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils/cn';

import { useArena } from '../hooks/use-arena';
import { ThreadPanel } from './thread-panel';

function RailButton({
  label,
  shortcut,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick} />}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="right">
        {label}
        {shortcut ? <kbd className="font-mono text-muted">{shortcut}</kbd> : null}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * The thread history. In the empty arena on wide screens: a 272px panel that collapses to a 64px
 * rail (`[`). Once a battle is on (and below `lg`): a slide-over from the left, opened from the
 * header or with `[`, so the stage keeps the whole width. The arena shell tells it which with
 * `wide` (see arena-app.tsx).
 */
export function ThreadSidebar() {
  const { wide, sidebarCollapsed, setSidebarCollapsed, newBattle, historyOpen, setHistoryOpen } =
    useArena();

  if (!wide) {
    return (
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent
          side="left"
          className="w-[min(100%-3rem,22rem)] gap-0 border-line-strong bg-surface p-0 shadow-float"
        >
          <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line pr-14 pl-5">
            <HistoryIcon aria-hidden="true" className="size-4 text-muted" strokeWidth={1.75} />
            <SheetTitle className="text-ui font-semibold">History</SheetTitle>
            <Kbd aria-hidden="true" className="ml-auto max-lg:hidden">
              [
            </Kbd>
          </div>
          <SheetDescription className="sr-only">
            Your battles and chats, newest first. Choose one to open it.
          </SheetDescription>
          <ThreadPanel />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      aria-label="History"
      data-collapsed={sidebarCollapsed ? '' : undefined}
      className={cn(
        'flex shrink-0 flex-col border-r border-line bg-surface/80 transition-[width] duration-(--dur-base) ease-out-expo',
        sidebarCollapsed ? 'w-16' : 'w-68',
      )}
    >
      {sidebarCollapsed ? (
        <div className="flex flex-col items-center gap-1 pt-3">
          <RailButton
            label="Show the history"
            shortcut="["
            onClick={() => setSidebarCollapsed(false)}
          >
            <PanelLeftOpen aria-hidden="true" strokeWidth={1.75} />
          </RailButton>
          <RailButton label="New battle" shortcut="N" onClick={newBattle}>
            <Plus aria-hidden="true" strokeWidth={1.75} />
          </RailButton>
          <RailButton label="Search threads" onClick={() => setSidebarCollapsed(false)}>
            <Search aria-hidden="true" strokeWidth={1.75} />
          </RailButton>
        </div>
      ) : (
        <>
          <div className="flex h-12 items-center justify-between border-b border-line pr-2 pl-5">
            <h2 className="eyebrow text-muted">History</h2>
            <RailButton
              label="Hide the history"
              shortcut="["
              onClick={() => setSidebarCollapsed(true)}
            >
              <PanelLeftClose aria-hidden="true" strokeWidth={1.75} />
            </RailButton>
          </div>
          <ThreadPanel />
        </>
      )}
    </aside>
  );
}
