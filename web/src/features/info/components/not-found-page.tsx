import { Search } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { FuzzyText } from '@/components/vendor/reactbits/fuzzy-text';
import { useCommandPalette } from '@/hooks/use-command-palette';
import { useModifierKey } from '@/hooks/use-modifier-key';

import { PageShell } from './page-shell';

/**
 * The 404 page: a fuzzy "404" (plain under reduced motion), one line in the human voice, the
 * two places to go and the command palette hint. Prerendered as dist/404.html; the Worker
 * serves it with status 404 for every unknown address.
 */
export function NotFoundPage() {
  const { setOpen } = useCommandPalette();
  const modifier = useModifierKey();

  return (
    <PageShell>
      <section
        aria-labelledby="not-found-title"
        className="grid min-h-[calc(100svh-22rem)] place-items-center px-4 py-20 text-center sm:px-6"
      >
        <div className="grid justify-items-center gap-8">
          <p className="eyebrow text-muted">Error 404</p>
          <h1 id="not-found-title" className="text-fg-soft">
            <FuzzyText baseIntensity={0} hoverIntensity={0}>
              404
            </FuzzyText>
            <span className="sr-only">. Page not found</span>
          </h1>
          <p className="max-w-[24ch] human-voice text-h2 text-balance text-human">
            This page took a wrong turn.
          </p>
          <p className="max-w-[44ch] text-body [text-wrap:pretty] text-fg-soft">
            The address may have a typo, or the page may have moved. Head back to the Arena, or look
            at how the models rank.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="/" className={buttonVariants({ variant: 'primary', size: 'md' })}>
              Start a battle
            </a>
            <a href="/leaderboard/" className={buttonVariants({ variant: 'outline', size: 'md' })}>
              See the leaderboard
            </a>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-haspopup="dialog">
            <Search aria-hidden="true" strokeWidth={1.75} />
            Or search the site
            <KbdGroup>
              <Kbd>{modifier === 'Cmd' ? '⌘' : 'Ctrl'}</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
          </Button>
        </div>
      </section>
    </PageShell>
  );
}
