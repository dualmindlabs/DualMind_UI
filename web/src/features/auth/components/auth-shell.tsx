import type { ReactNode } from 'react';

import { SkipLink } from '@/components/layout/skip-link';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Wordmark } from '@/components/layout/wordmark';

import type { BrandQuote } from '../content/copy';
import { BrandPanel } from './brand-panel';
import { LegalFooter } from './legal-footer';

/**
 * The sign-in pages' frame: a form column (wordmark home link, theme switch, the form on a lit
 * card, legal links) and, on wide screens, the brand panel with a sample duel. On phones the two
 * Minds' pools of light sit behind the top of the page, so the colour identity is there too.
 */
export function AuthShell({ quote, children }: { quote: BrandQuote; children: ReactNode }) {
  return (
    <div className="grid min-h-svh bg-bg lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <SkipLink />
      <div className="relative isolate flex min-h-svh min-w-0 flex-col px-4 py-5 sm:px-8 lg:px-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 mesh-duel [mask-image:linear-gradient(to_bottom,black,transparent)] lg:hidden"
        />
        <header className="flex items-center justify-between gap-4">
          <a
            href="/"
            aria-label="DualMind Arena, home"
            className="inline-flex min-h-11 items-center rounded-sm"
          >
            <Wordmark title={null} className="h-3.5" />
          </a>
          <ThemeToggle compact />
        </header>
        <main
          id="main"
          tabIndex={-1}
          className="flex flex-1 items-center justify-center py-8 outline-none sm:py-12"
        >
          <div className="surface-duel w-full max-w-[28rem] p-6 sm:p-9">{children}</div>
        </main>
        <LegalFooter />
      </div>
      <BrandPanel quote={quote} />
    </div>
  );
}
