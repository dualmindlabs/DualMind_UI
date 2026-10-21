import type { ReactNode } from 'react';

import { SkipLink } from '@/components/layout/skip-link';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Wordmark } from '@/components/layout/wordmark';
import { SilkPoster } from '@/components/motion/silk-poster';

/**
 * The frame of the two email-link pages (/auth-callback.html and /update-password.html): the
 * wordmark and theme switch on top, one centred card, the still Silk poster behind it.
 */
export function StatusShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-svh flex-col bg-bg px-4 py-5 sm:px-8">
      <SkipLink />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black,transparent)] opacity-60"
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
        className="flex flex-1 items-center justify-center py-10 outline-none"
      >
        <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-raise-strong sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
