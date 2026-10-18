import { LINKS } from '@/content/links';
import { ArrowUpRight } from './icons';
import { Wordmark } from './Wordmark';

export function Nav() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:h-20 sm:px-8">
        <a href="/" className="text-[19px] text-fg transition-colors hover:text-fg" aria-label="DualMind Arena waitlist">
          <Wordmark />
        </a>
        <nav aria-label="Main" className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.22em] text-fg-soft">
          <a href="#how" className="link-sweep hidden md:inline">
            How it works
          </a>
          <a href="#leaderboard" className="link-sweep hidden md:inline">
            Leaderboard
          </a>
          <a href={LINKS.docs} target="_blank" rel="noopener noreferrer" className="link-sweep inline-flex items-center gap-1">
            Docs
            <ArrowUpRight className="size-3.5" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
