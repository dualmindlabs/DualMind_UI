import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Wordmark } from '@/components/layout/wordmark';

export function DesignHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-glass backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-page items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <a href="/" aria-label="DualMind Arena home" className="rounded-sm">
            <Wordmark className="text-ui-sm sm:text-ui" />
          </a>
          <span aria-hidden="true" className="hidden h-4 w-px bg-line sm:block" />
          <span className="eyebrow hidden text-muted sm:inline">Design system</span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
