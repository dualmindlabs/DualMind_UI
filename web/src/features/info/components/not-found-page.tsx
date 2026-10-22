import { Search } from 'lucide-react';
import { type ReactNode, useState, useSyncExternalStore } from 'react';

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SkipLink } from '@/components/layout/skip-link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { ModelMark } from '@/components/ui/model-mark';
import { useCommandPalette } from '@/hooks/use-command-palette';
import { useModifierKey } from '@/hooks/use-modifier-key';
import { cn } from '@/lib/utils/cn';

import './error-stage.css';

type Vote = 'a' | 'b' | 'tie' | 'both-bad';

const votes: { id: Vote; label: string; tone: 'a' | 'b' | 'plain' }[] = [
  { id: 'a', label: 'A is better', tone: 'a' },
  { id: 'tie', label: 'Tie', tone: 'plain' },
  { id: 'both-bad', label: 'Both bad', tone: 'plain' },
  { id: 'b', label: 'B is better', tone: 'b' },
];

const verdict: Record<Vote, string> = {
  'both-bad': 'The only correct vote. Neither answer is a page.',
  a: 'Bold pick. Neither answer is a page, but A did notice the typo.',
  b: 'Bold pick. Neither answer is a page, but B did say where to go next.',
  tie: 'A tie, fair enough. Neither answer is a page.',
};

const noSubscribe = () => () => {};

/** The address that was not found, read after hydration only (the prerendered page is generic). */
function useMissingPath(): string | null {
  return useSyncExternalStore(
    noSubscribe,
    () => window.location.pathname,
    () => null,
  );
}

function Pane({
  who,
  title,
  revealed,
  name,
  children,
  delay,
}: {
  who: 'a' | 'b';
  title: string;
  revealed: boolean;
  name: string;
  children: ReactNode;
  delay: number;
}) {
  return (
    <article
      aria-label={title}
      data-testid={`not-found-pane-${who}`}
      style={{ ['--nf-delay' as string]: `${delay}ms` }}
      className={cn(
        'nf-rise flex flex-col gap-5 p-5 text-left sm:p-6',
        who === 'a' ? 'surface-a' : 'surface-b',
      )}
    >
      <header className="flex items-center gap-3">
        <ModelMark name={who.toUpperCase()} who={who} size="md" />
        <div className="grid gap-0.5">
          <h2 className="text-ui font-semibold text-fg">{title}</h2>
          <Eyebrow tone="muted" className="normal-case tracking-normal">
            {revealed ? name : 'Hidden until you vote'}
          </Eyebrow>
        </div>
      </header>
      <p className="text-lead text-balance text-fg">
        {children}
        {revealed ? null : <span aria-hidden="true" className="nf-caret text-muted" />}
      </p>
    </article>
  );
}

/**
 * The 404 page: the wrong turn staged as a duel. Two answers to "where is this page?", neither of
 * them a page; the vote reveals who said what. Below it the real ways out: the Arena, the
 * leaderboard and the command palette (its shortcut only where there is a keyboard).
 * Prerendered as dist/404.html; the Worker serves it with status 404 for every unknown address.
 *
 * It lays out its own frame instead of PageShell so the header can be told that no page is
 * current. Left to the router location, a nested address such as /leaderboard/nope/deeper marked
 * "Leaderboard" as current on the client but not in the prerendered page at /404, and React
 * threw a hydration error (#418) that swapped the page for the unthemed error screen.
 */
export function NotFoundPage() {
  const { setOpen } = useCommandPalette();
  const modifier = useModifierKey();
  const missing = useMissingPath();
  const [vote, setVote] = useState<Vote | null>(null);
  const revealed = vote !== null;

  return (
    <>
      <SkipLink />
      <SiteHeader className="print:hidden" activePath="/404" />
      <main id="main" tabIndex={-1} className="outline-none">
        <section
          aria-labelledby="not-found-title"
          className="mesh-duel relative isolate overflow-hidden px-4 pt-14 pb-20 text-center sm:px-6 sm:pt-20 sm:pb-28"
        >
          <div aria-hidden="true" className="bg-grid pointer-events-none absolute inset-0 -z-10" />

          <div className="mx-auto grid max-w-4xl justify-items-center gap-8">
            <p className="kicker">Error 404 · Page not found</p>

            <h1 id="not-found-title" className="grid justify-items-center gap-6">
              <span aria-hidden="true" className="nf-code" data-text="404">
                404
              </span>
              <span className="sr-only">404. Page not found</span>
              <span className="max-w-[18ch] text-h2 text-balance text-fg">
                This page took a <span className="human-voice text-human">wrong turn.</span>
              </span>
            </h1>

            <p className="max-w-[46ch] text-lead text-balance text-fg-soft">
              We asked two models where it went. Judge their answers.
            </p>

            {/* The staged duel: the prompt, two answers, the vote, the reveal. */}
            <div className="grid w-full gap-4 text-left">
              <p
                className="mx-auto flex max-w-full items-center gap-2.5 rounded-full border border-line bg-surface px-4 py-2 text-ui-sm text-fg-soft shadow-raise"
                data-testid="not-found-prompt"
              >
                <span className="eyebrow shrink-0 text-human">Prompt</span>
                <span className="min-w-0 truncate font-mono text-caption text-fg">
                  Where is {missing ?? 'this page'}?
                </span>
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <Pane
                  who="a"
                  title="Answer A"
                  name="typo.html"
                  revealed={revealed}
                  delay={80}
                >
                  There is no such page. Check the address for a typo.
                </Pane>
                <Pane
                  who="b"
                  title="Answer B"
                  name="moved.html"
                  revealed={revealed}
                  delay={200}
                >
                  It moved, or it never existed. Try the leaderboard.
                </Pane>
              </div>

              <div
                role="group"
                aria-label="Which answer is better?"
                className="nf-rise grid grid-cols-2 gap-2.5 sm:grid-cols-4"
                style={{ ['--nf-delay' as string]: '320ms' }}
              >
                {votes.map(option => (
                  <Button
                    key={option.id}
                    variant="outline"
                    size="md"
                    aria-pressed={vote === option.id}
                    onClick={() => setVote(option.id)}
                    className={cn(
                      'bg-surface shadow-raise',
                      option.tone === 'a' &&
                        'border-mind-a-edge text-mind-a hover:bg-mind-a-tint aria-pressed:glow-a aria-pressed:bg-mind-a-tint',
                      option.tone === 'b' &&
                        'border-mind-b-edge text-mind-b-text hover:bg-mind-b-tint aria-pressed:glow-b aria-pressed:bg-mind-b-tint',
                      option.tone === 'plain' && 'aria-pressed:border-fg-soft aria-pressed:bg-hover',
                    )}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              <p
                role="status"
                data-testid="not-found-verdict"
                className="min-h-6 text-center text-ui text-fg-soft"
              >
                {vote ? (
                  <>
                    <span className="font-medium text-fg">{verdict[vote]}</span>{' '}
                    <button
                      type="button"
                      onClick={() => setVote(null)}
                      className="rounded-sm text-mind-a underline underline-offset-4 hit-area"
                    >
                      Ask again
                    </button>
                  </>
                ) : (
                  'Pick one. Names stay hidden until you vote.'
                )}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <a href="/" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
                Start a battle
              </a>
              <a
                href="/leaderboard/"
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
              >
                See the leaderboard
              </a>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              aria-keyshortcuts="Control+K Meta+K"
            >
              <Search aria-hidden="true" strokeWidth={1.75} />
              Or search the site
              {/* A keyboard hint means nothing on a touch screen. */}
              <KbdGroup className="pointer-coarse:hidden" data-testid="not-found-shortcut">
                <Kbd>{modifier === 'Cmd' ? '⌘' : 'Ctrl'}</Kbd>
                <Kbd>K</Kbd>
              </KbdGroup>
            </Button>
          </div>
        </section>
      </main>
      <div className="print:hidden">
        <SiteFooter />
      </div>
    </>
  );
}
