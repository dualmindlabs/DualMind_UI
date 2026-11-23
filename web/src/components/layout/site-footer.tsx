import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { Emblem } from '@/components/layout/emblem';
import { Wordmark } from '@/components/layout/wordmark';
import { buttonVariants } from '@/components/ui/button';
import { BRAND_SUPPORTING } from '@/content/brand';
import { footerColumns } from '@/lib/site/links';
import { cn } from '@/lib/utils/cn';

export interface SiteFooterProps {
  /**
   * The API status slot under the brand. The live dot (GET /health through the API client) lands
   * with the API slice; until then nothing is rendered here.
   */
  status?: ReactNode;
  /** The navigation landmark's name; give previews their own. */
  navLabel?: string;
  className?: string;
}

/** Copyright year, fixed at build time: pages are prerendered and rebuilt on every deploy. */
const YEAR = new Date().getFullYear();

const linkClass =
  'group/link inline-flex min-h-9 items-center gap-1 rounded-sm text-ui-sm text-fg-soft transition-colors duration-(--dur-fast) ease-out-expo hover:text-fg pointer-coarse:min-h-11 pointer-coarse:min-w-11';

/**
 * The site footer: a closing call to action under the two Minds' light, brand and a one-line
 * pitch, four link columns, and the wordmark set huge and faded into the page.
 */
export function SiteFooter({ status, navLabel = 'Footer', className }: SiteFooterProps) {
  return (
    <footer
      data-slot="site-footer"
      className={cn('relative isolate overflow-hidden border-t border-line bg-bg-deep', className)}
    >
      {/* The duel's light: Mind A and Mind B pools at the top edge, and a lit hairline. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 mesh-duel" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--mind-a-edge)_25%,var(--edge-hi)_50%,var(--mind-b-edge)_75%,transparent)]"
      />

      <div className="mx-auto grid max-w-page gap-8 px-4 pt-16 pb-12 sm:px-6 md:grid-cols-[minmax(0,1.5fr)_auto] md:items-end md:pt-20">
        <div className="grid gap-4">
          <p className="eyebrow text-muted">Your vote decides</p>
          <h2 className="max-w-[18ch] text-h1 text-fg">Two minds. One prompt. You pick.</h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href="/"
            className={cn(buttonVariants({ variant: 'primary', size: 'lg' }), 'rounded-full')}
          >
            Start judging
          </a>
          <a
            href="/leaderboard/"
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-full')}
          >
            Check the rankings
          </a>
        </div>
      </div>

      <div className="mx-auto grid max-w-page gap-12 border-t border-line px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
        <div className="grid content-start gap-5">
          <a
            href="/"
            aria-label="DualMind Arena, home"
            className="group/home inline-flex w-fit items-center gap-2.5 rounded-sm pointer-coarse:min-h-11"
          >
            <Emblem interactive className="size-7" />
            <Wordmark title={null} className="h-3.5" />
          </a>
          <p className="max-w-[36ch] text-ui-sm text-muted">
            Two anonymous models answer the same prompt. You pick the better one, then see who wrote
            it. Every vote moves the public leaderboard.
          </p>
          {status ? <div data-slot="footer-status">{status}</div> : null}
        </div>
        <nav aria-label={navLabel} className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {footerColumns.map(column => (
            <div key={column.title} className="grid content-start gap-3">
              <h2 className="eyebrow text-muted">{column.title}</h2>
              <ul className="grid gap-0.5">
                {column.links.map(link => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      {...(link.external && link.href.startsWith('https:')
                        ? { rel: 'noopener noreferrer' }
                        : {})}
                      className={linkClass}
                    >
                      {link.label}
                      {link.external ? (
                        <ArrowUpRight
                          aria-hidden="true"
                          className="size-3.5 text-muted transition-transform duration-(--dur-fast) ease-out-expo group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
                          strokeWidth={1.75}
                        />
                      ) : null}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* The wordmark as a watermark: decorative, faded into the page. */}
      <div
        aria-hidden="true"
        className="pointer-events-none mx-auto max-w-page px-4 select-none sm:px-6"
        style={{
          maskImage: 'linear-gradient(180deg, black 0%, transparent 92%)',
          WebkitMaskImage: 'linear-gradient(180deg, black 0%, transparent 92%)',
        }}
      >
        <Wordmark title={null} className="h-auto w-full opacity-[0.07]" />
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-page flex-col gap-3 px-4 py-6 text-caption text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {YEAR} DualMind Labs. All rights reserved.</p>
          <p className="eyebrow">{BRAND_SUPPORTING}</p>
        </div>
      </div>
    </footer>
  );
}
