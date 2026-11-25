import { ArrowUpRight } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { CHANGELOG_URL, GITHUB_URL, ORG_SITE_URL, SUPPORT_EMAIL } from '@/lib/site/links';
import { cn } from '@/lib/utils/cn';

const linkClass = cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full');

/**
 * "Built by DualMind Labs": who is behind the Arena, with links a visitor can check (the public
 * source, the changelog, the organization's site and the support inbox). Facts only: no
 * testimonials, no star counts, no numbers typed in by hand (the live numbers are in the strip
 * under the hero, from the leaderboard).
 */
export function BuiltByStrip() {
  return (
    <section aria-labelledby="built-by-title" className="border-t border-line py-14 md:py-16">
      <div className="mx-auto flex max-w-page flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between md:gap-10">
        <div className="max-w-xl">
          <h2 id="built-by-title" className="text-h3 text-fg">
            Built by DualMind Labs
          </h2>
          <p className="mt-2 text-ui text-fg-soft">
            The code is public, every change is in the changelog, and the ratings method is written
            down. Questions go to the support inbox.
          </p>
        </div>
        <ul className="flex flex-wrap items-center gap-3">
          <li>
            <a href={GITHUB_URL} className={linkClass} rel="noopener">
              Source on GitHub
              <ArrowUpRight aria-hidden="true" strokeWidth={2} />
            </a>
          </li>
          <li>
            <a href={CHANGELOG_URL} className={linkClass} rel="noopener">
              Changelog
              <ArrowUpRight aria-hidden="true" strokeWidth={2} />
            </a>
          </li>
          <li>
            <a href={ORG_SITE_URL} className={linkClass} rel="noopener">
              dualmindlab.tech
              <ArrowUpRight aria-hidden="true" strokeWidth={2} />
            </a>
          </li>
          <li>
            <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
              {SUPPORT_EMAIL}
            </a>
          </li>
        </ul>
      </div>
    </section>
  );
}
