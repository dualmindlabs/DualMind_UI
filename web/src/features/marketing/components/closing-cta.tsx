import { ArrowRight } from 'lucide-react';

import { Emblem } from '@/components/layout/emblem';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

import { HOW_IT_WORKS_HREF, LEADERBOARD_HREF, SIGN_IN_HREF } from '../content/landing';

const PROMISES = ['Blind votes', 'Public Elo ratings', 'Open methodology'] as const;

/**
 * The closing call to action and the hand-off to the footer: one big sentence, one primary button
 * with the Mind A glow, a quiet second link, and three promises. The section sits on the page
 * background with Mind A and Mind B light rising from the bottom edge, so the footer (the deep
 * background) starts where the light ends.
 */
export function ClosingCta() {
  return (
    <section
      aria-labelledby="cta-title"
      className="relative isolate overflow-hidden border-t border-line py-24 md:py-40"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_60%_70%_at_50%_100%,black,transparent)] opacity-60" />
        <div className="absolute -bottom-1/2 left-[38%] aspect-square w-[min(72rem,150%)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--mind-a)_20%,transparent),transparent_70%)]" />
        <div className="absolute -bottom-1/2 left-[64%] aspect-square w-[min(60rem,130%)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--mind-b)_20%,transparent),transparent_70%)]" />
        <div className="absolute inset-0">
          <div className="grain size-full" />
        </div>
      </div>
      <div className="mx-auto flex max-w-4xl flex-col items-center px-4 text-center sm:px-6">
        <Emblem className="size-12" />
        <h2 id="cta-title" className="mt-8 text-h1 text-fg">
          Bring your own prompt. <span className="human-voice text-human">Cast your vote.</span>
        </h2>
        <p className="mt-6 max-w-xl text-lead text-fg-soft">
          Sign in to send your prompts to real models. Every vote you cast moves the public
          leaderboard.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
          <a
            href={SIGN_IN_HREF}
            className={cn(
              buttonVariants({ variant: 'primary', size: 'lg' }),
              'press rounded-full px-8 shadow-glow-a',
            )}
          >
            Start a battle
            <ArrowRight aria-hidden="true" strokeWidth={2} />
          </a>
          <a
            href={LEADERBOARD_HREF}
            className={cn(buttonVariants({ variant: 'ghost', size: 'lg' }), 'rounded-full')}
          >
            See the leaderboard
          </a>
        </div>
        <ul className="mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 eyebrow text-muted">
          {PROMISES.map(promise => (
            <li key={promise} className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-human" />
              {promise}
            </li>
          ))}
          <li>
            <a
              href={HOW_IT_WORKS_HREF}
              className="inline-flex min-h-8 items-center rounded-sm text-fg-soft underline decoration-line-strong underline-offset-4 hover:text-fg"
            >
              How it works
            </a>
          </li>
        </ul>
      </div>
    </section>
  );
}
