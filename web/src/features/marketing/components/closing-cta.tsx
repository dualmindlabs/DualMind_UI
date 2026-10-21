import { ArrowRight } from 'lucide-react';

import { Emblem } from '@/components/layout/emblem';
import { buttonVariants } from '@/components/ui/button';
import { Magnet } from '@/components/vendor/reactbits/magnet';
import { StarBorder } from '@/components/vendor/reactbits/star-border';
import { cn } from '@/lib/utils/cn';

import { LEADERBOARD_HREF, SIGN_IN_HREF } from '../content/landing';

/**
 * The closing call to action: one primary button framed by React Bits Star Border, which leans
 * towards the pointer on desktop (Magnet: fine pointers only, off under reduced motion), and a
 * quiet secondary link.
 */
export function ClosingCta() {
  return (
    <section
      aria-labelledby="cta-title"
      className="relative isolate overflow-hidden border-t border-line bg-bg-deep py-24 md:py-36"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 dot-grid [mask-image:radial-gradient(ellipse_50%_60%_at_50%_100%,black,transparent)] opacity-40" />
        <div className="absolute -bottom-1/2 left-1/2 aspect-square w-[min(70rem,140%)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--mind-a)_14%,transparent),transparent_70%)]" />
        <div className="absolute -bottom-1/3 left-[62%] aspect-square w-[min(44rem,90%)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--mind-b)_16%,transparent),transparent_70%)]" />
      </div>
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 text-center sm:px-6">
        <Emblem className="size-12" />
        <h2 id="cta-title" className="mt-8 text-h1 font-light tracking-[-0.035em] text-fg">
          Bring your own prompt. <span className="human-voice text-human">Cast your vote.</span>
        </h2>
        <p className="mt-5 max-w-xl text-h3 font-normal text-fg-soft">
          Sign in to send your prompts to real models. Every vote you cast moves the public
          leaderboard.
        </p>
        <div className="mt-10 flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
          <Magnet padding={80} strength={4} maxOffset={14}>
            <StarBorder radius={999} duration={5} color="--mind-a" trailColor="--mind-b">
              <a
                href={SIGN_IN_HREF}
                className={cn(
                  buttonVariants({ variant: 'primary', size: 'lg' }),
                  'rounded-full px-7',
                )}
              >
                Start a battle
                <ArrowRight aria-hidden="true" strokeWidth={2} />
              </a>
            </StarBorder>
          </Magnet>
          <a
            href={LEADERBOARD_HREF}
            className={cn(buttonVariants({ variant: 'ghost', size: 'lg' }), 'rounded-full')}
          >
            See the leaderboard
          </a>
        </div>
      </div>
    </section>
  );
}
