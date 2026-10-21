import type { ReactNode } from 'react';

import { SkipLink } from '@/components/layout/skip-link';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Wordmark } from '@/components/layout/wordmark';
import { SilkPoster } from '@/components/motion/silk-poster';

import type { BrandQuote } from '../content/copy';
import { BrandPanel } from './brand-panel';
import { LegalFooter } from './legal-footer';

/**
 * The sign-in pages' frame: a form column (wordmark home link, theme switch, the form centred,
 * legal links) and, on wide screens, the brand panel. One column on phones, where a still
 * glow of the Silk poster sits behind the top of the page.
 */
export function AuthShell({ quote, children }: { quote: BrandQuote; children: ReactNode }) {
  return (
    <div className="grid min-h-svh bg-bg lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <SkipLink />
      <div className="relative isolate flex min-h-svh min-w-0 flex-col px-4 py-5 sm:px-8 lg:px-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 [mask-image:linear-gradient(to_bottom,black,transparent)] opacity-70 lg:hidden"
        >
          <SilkPoster />
        </div>
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
          className="flex flex-1 items-center justify-center py-10 outline-none sm:py-14"
        >
          <div className="w-full max-w-[26rem]">{children}</div>
        </main>
        <LegalFooter />
      </div>
      <BrandPanel quote={quote} />
    </div>
  );
}
