import type { ReactNode } from 'react';

import { Emblem } from '@/components/layout/emblem';
import { Wordmark } from '@/components/layout/wordmark';
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

/** The quiet site footer: brand, three link columns (product, company, legal), copyright. */
export function SiteFooter({ status, navLabel = 'Footer', className }: SiteFooterProps) {
  return (
    <footer className={cn('border-t border-line bg-bg-deep', className)}>
      <div className="mx-auto grid max-w-page gap-12 px-4 pt-14 pb-10 sm:px-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)] md:pt-16">
        <div className="grid content-start gap-5">
          <a
            href="/"
            aria-label="DualMind Arena, home"
            className="inline-flex w-fit items-center gap-2.5 rounded-sm"
          >
            <Emblem className="size-7" />
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
            <div key={column.title} className="grid content-start gap-4">
              <h2 className="eyebrow text-muted">{column.title}</h2>
              <ul className="grid gap-1">
                {column.links.map(link => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      {...(link.external && link.href.startsWith('https:')
                        ? { rel: 'noopener noreferrer' }
                        : {})}
                      className="inline-flex min-h-8 items-center rounded-sm text-ui-sm text-fg-soft transition-colors duration-(--dur-fast) ease-out-expo hover:text-fg"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
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
