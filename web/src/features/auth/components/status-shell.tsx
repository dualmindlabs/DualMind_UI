import type { ReactNode } from 'react';

import { SkipLink } from '@/components/layout/skip-link';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Wordmark } from '@/components/layout/wordmark';

import { LegalFooter } from './legal-footer';

/**
 * The frame of the two email-link pages (/auth-callback.html and /update-password.html): the
 * wordmark and theme switch on top, one centred lit card, the two Minds' pools of light and a grid behind it.
 */
export function StatusShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-svh flex-col bg-bg px-4 py-5 sm:px-8">
      <SkipLink />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 mesh-duel [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-50"
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
        className="flex flex-1 items-center justify-center py-10 outline-none"
      >
        <div className="w-full max-w-md surface-float p-7 sm:p-10">{children}</div>
      </main>
      <LegalFooter />
    </div>
  );
}
