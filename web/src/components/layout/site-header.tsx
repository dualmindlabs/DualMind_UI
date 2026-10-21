import { type CSSProperties, lazy, type ReactNode, Suspense } from 'react';
import { useLocation } from 'react-router';

import { CommandPaletteTrigger } from '@/components/layout/command-palette-trigger';
import { Emblem } from '@/components/layout/emblem';
import { SiteNav } from '@/components/layout/site-nav';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Wordmark } from '@/components/layout/wordmark';
import { buttonVariants } from '@/components/ui/button';
import { useScrolled } from '@/hooks/use-scrolled';
import { signInLink } from '@/lib/site/links';
import { cn } from '@/lib/utils/cn';

export interface SiteHeaderProps {
  /**
   * `marketing`: transparent at the top of the page, it condenses into a floating pill once the
   * page scrolls. `app`: a compact 56px bar for the arena and other app pages.
   */
  variant?: 'marketing' | 'app';
  /** Marketing only: let the first section run under the header (heroes). */
  overlay?: boolean;
  /** `sticky` on real pages; `static` for previews on the style guide. */
  position?: 'sticky' | 'static';
  /** Marketing only: show the condensed pill regardless of scroll (previews). */
  condensed?: boolean;
  /** The current path for the active link; defaults to the router's location. */
  activePath?: string;
  /** The navigation landmark's name; give previews their own. */
  navLabel?: string;
  /** `false` renders a plain <div> instead of the page's <header> landmark (previews). */
  landmark?: boolean;
  /** App only: controls before the home link (the arena's history button on small screens). */
  leading?: ReactNode;
  /** Replaces the sign-in link, for example with the signed-in account menu. */
  account?: ReactNode;
  className?: string;
}

// The phone menu (a Base UI drawer) loads after hydration; its button is in the prerendered HTML,
// and React replays a tap that lands before the code arrives.
const MobileNav = lazy(() =>
  import('@/components/layout/mobile-nav').then(module => ({ default: module.MobileNav })),
);

/**
 * Where the condensed pill sits, in container units of the header's row (100cqw), so previews
 * in narrower frames work too: the content moves inward by --nav-shift (transform only, nothing
 * re-lays out) while the pill fades and settles in behind it. Inspired by the behaviour of
 * Aceternity UI's Resizable Navbar, written from scratch.
 */
const pillGeometry = {
  '--pill-w': 'min(100cqw - 1rem, 68rem)',
  '--nav-shift': 'max(0px, (100cqw - 1.5rem - min(100cqw - 1rem, 68rem)) / 2)',
} as CSSProperties;

function HomeLink({ className }: { className?: string }) {
  return (
    <a
      href="/"
      aria-label="DualMind Arena, home"
      className={cn(
        'pointer-events-auto inline-flex shrink-0 items-center gap-2.5 rounded-sm',
        className,
      )}
    >
      <Emblem className="hidden size-6 sm:block" />
      <Wordmark title={null} className="h-3" />
    </a>
  );
}

/** The site header: home link, main navigation, command palette, theme, sign in, phone menu. */
export function SiteHeader({
  variant = 'marketing',
  overlay = false,
  position = 'sticky',
  condensed,
  activePath,
  navLabel = 'Main',
  landmark = true,
  leading,
  account,
  className,
}: SiteHeaderProps) {
  const Root = landmark ? 'header' : 'div';
  const location = useLocation();
  const scrolled = useScrolled(8);
  const path = activePath ?? location.pathname;

  const actions = (
    <>
      {/* The compact app bar leaves room for its own controls on narrow phones. */}
      <CommandPaletteTrigger
        appearance="icon"
        className={cn('lg:hidden', variant === 'app' && 'max-sm:hidden')}
      />
      <CommandPaletteTrigger appearance="pill" className="hidden lg:inline-flex" />
      <ThemeToggle compact className="hidden lg:inline-flex" />
      {account ?? (
        <a
          href={signInLink.href}
          className={cn(
            buttonVariants({ variant: variant === 'app' ? 'outline' : 'primary', size: 'sm' }),
            'hidden rounded-full sm:inline-flex',
          )}
        >
          {signInLink.label}
        </a>
      )}
      <Suspense fallback={null}>
        <MobileNav
          activePath={path}
          label={navLabel}
          hideSignIn={account !== undefined}
          className="lg:hidden"
        />
      </Suspense>
    </>
  );

  if (variant === 'app') {
    return (
      <Root
        data-slot="site-header"
        data-variant="app"
        className={cn(
          'z-40 h-14 border-b border-line bg-glass backdrop-blur-md',
          position === 'sticky' && 'sticky top-0',
          className,
        )}
      >
        <div className="flex h-full items-center gap-2 px-3 sm:gap-3 sm:px-6">
          {leading}
          <HomeLink />
          <span aria-hidden="true" className="mx-2 hidden h-5 w-px bg-line lg:block" />
          <SiteNav activePath={path} label={navLabel} size="sm" className="hidden lg:block" />
          <div className="ml-auto flex items-center gap-1.5">{actions}</div>
        </div>
      </Root>
    );
  }

  const isCondensed = condensed ?? scrolled;

  return (
    <Root
      data-slot="site-header"
      data-variant="marketing"
      data-condensed={isCondensed ? '' : undefined}
      style={pillGeometry}
      className={cn(
        // The bar is see-through at the top: only its controls (and the pill) take clicks.
        'group/header pointer-events-none z-40 h-16',
        position === 'sticky' && 'sticky top-0',
        overlay && '-mb-16',
        className,
      )}
    >
      <div className="@container relative mx-auto flex h-full max-w-page items-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-2 left-1/2 w-(--pill-w) -translate-x-1/2 scale-x-[1.04] scale-y-110 rounded-full border border-line bg-glass opacity-0 shadow-raise-strong backdrop-blur-md transition-[opacity,scale] duration-(--dur-slow) ease-out-expo group-data-condensed/header:pointer-events-auto group-data-condensed/header:scale-100 group-data-condensed/header:opacity-100"
        />
        <div className="relative flex w-full items-center gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-8 transition-[translate] duration-(--dur-slow) ease-out-expo lg:group-data-condensed/header:translate-x-(--nav-shift)">
            <HomeLink />
            <SiteNav
              activePath={path}
              label={navLabel}
              className="pointer-events-auto hidden lg:block"
            />
          </div>
          <div className="pointer-events-auto ml-auto flex items-center gap-1.5 transition-[translate] duration-(--dur-slow) ease-out-expo lg:group-data-condensed/header:-translate-x-(--nav-shift)">
            {actions}
          </div>
        </div>
      </div>
    </Root>
  );
}
