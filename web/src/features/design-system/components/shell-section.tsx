import { CircleCheck, Link2, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';

import { CommandPaletteTrigger } from '@/components/layout/command-palette-trigger';
import { MobileNav } from '@/components/layout/mobile-nav';
import { SiteHeader } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { toast } from '@/components/ui/sonner';
import { useModifierKey } from '@/hooks/use-modifier-key';

import { KitCard } from './kit-card';
import { Section } from './section';

/** A framed stage for a header preview: the page behind it, so the transparent state reads. */
function Stage({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="grid gap-3">
      <div className="relative isolate overflow-hidden rounded-lg border border-line bg-bg-deep">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 dot-grid [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
        />
        {children}
        <div aria-hidden="true" className="grid gap-2 px-6 pt-4 pb-8">
          <div className="h-3 w-2/5 rounded-full bg-surface-3" />
          <div className="h-3 w-3/5 rounded-full bg-surface-3 opacity-60" />
        </div>
      </div>
      <figcaption className="eyebrow text-muted">{label}</figcaption>
    </figure>
  );
}

function wait(ms: number) {
  return new Promise<void>(resolve => window.setTimeout(resolve, ms));
}

/** The site shell: both header variants, the phone menu, the command palette and toasts. */
export function ShellSection() {
  const modifier = useModifierKey();

  return (
    <Section
      id="shell"
      title={
        <>
          The frame around <span className="human-voice text-human">every page.</span>
        </>
      }
      lead={
        <p>
          The header this page uses is the real one: transparent over the hero, a floating pill once
          you scroll. The arena gets a compact bar. The footer below is the real footer too.
        </p>
      }
    >
      <div className="grid gap-8">
        <Stage label="Marketing header, at the top of the page">
          <SiteHeader
            landmark={false}
            position="static"
            condensed={false}
            activePath="/leaderboard/"
            navLabel="Main, preview at the top"
          />
        </Stage>
        <Stage label="Marketing header, condensed after scrolling">
          <SiteHeader
            landmark={false}
            position="static"
            condensed
            activePath="/leaderboard/"
            navLabel="Main, preview condensed"
          />
        </Stage>
        <Stage label="App header, for the arena (56px)">
          <SiteHeader
            landmark={false}
            variant="app"
            position="static"
            activePath="/"
            navLabel="Main, app preview"
          />
        </Stage>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <KitCard
          title="Phone menu"
          source="@/components/layout/mobile-nav"
          description="A bottom drawer: swipe down, Esc or Close to dismiss. Focus stays inside while it is open and it closes when the route changes."
        >
          <div className="flex items-center gap-3">
            <MobileNav activePath="/" label="Main, menu preview" className="border-line-strong" />
            <span className="text-ui-sm text-fg-soft">Open the menu</span>
          </div>
        </KitCard>

        <KitCard
          title="Command palette"
          source="@/components/layout/command-palette"
          description="Jump to any page or switch the theme. The arena adds its own commands later."
        >
          <div className="flex flex-wrap items-center gap-3">
            <CommandPaletteTrigger />
            <CommandPaletteTrigger appearance="icon" />
          </div>
          <p className="flex flex-wrap items-center gap-2 text-ui-sm text-fg-soft">
            Or press
            <KbdGroup>
              <Kbd>{modifier === 'Cmd' ? '⌘' : 'Ctrl'}</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
            anywhere.
          </p>
        </KitCard>

        <KitCard
          title="Toasts"
          source="@/components/ui/sonner"
          description="Announced politely, never the only copy of something important. Errors stay longer and offer a retry."
        >
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                toast.success('Vote saved', { description: 'Model names are revealed.' })
              }
            >
              <CircleCheck aria-hidden="true" strokeWidth={1.75} />
              Vote saved
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => toast('Link copied', { description: 'Anyone with it can view.' })}
            >
              <Link2 aria-hidden="true" strokeWidth={1.75} />
              Link copied
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                toast.error('Could not reach the Arena', {
                  description: 'Check your connection.',
                  action: { label: 'Retry', onClick: () => toast.success('Back online') },
                })
              }
            >
              <WifiOff aria-hidden="true" strokeWidth={1.75} />
              Offline
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                void toast.promise(wait(1600), {
                  loading: 'Saving your vote',
                  success: 'Vote saved',
                  error: 'Could not save the vote',
                })
              }
            >
              Saving
            </Button>
          </div>
        </KitCard>
      </div>
    </Section>
  );
}
