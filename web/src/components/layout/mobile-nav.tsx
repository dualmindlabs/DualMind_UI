import { ArrowUpRight, Menu, Search } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'react-router';

import { Emblem } from '@/components/layout/emblem';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Wordmark } from '@/components/layout/wordmark';
import { buttonVariants } from '@/components/ui/button';
import {
  Drawer,
  DrawerCloseButton,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useCommandPalette } from '@/hooks/use-command-palette';
import { footerColumns, isActivePath, primaryNav, signInLink } from '@/lib/site/links';
import { cn } from '@/lib/utils/cn';

export interface MobileNavProps {
  /** The current path, for aria-current; defaults to the router's location. */
  activePath?: string;
  /** The landmark's name inside the drawer. */
  label?: string;
  /** Leaves out the sign-in button (the visitor is signed in; the header has an account menu). */
  hideSignIn?: boolean;
  className?: string;
}

const smallLinks = footerColumns
  .flatMap(column => column.links)
  .filter(link => ['/about/', '/faq/', '/privacy/', '/terms/'].includes(link.href));

/**
 * The phone menu: a button that opens a bottom drawer (swipe down, Esc or the close button to
 * dismiss) with the main links, the theme switch and sign in. Focus is trapped inside while it is
 * open and returns to the menu button. It closes by itself when the route changes.
 */
export function MobileNav({
  activePath,
  label = 'Main',
  hideSignIn = false,
  className,
}: MobileNavProps) {
  const location = useLocation();
  const path = activePath ?? location.pathname;
  // Open "for" one location: when the route changes the key differs, so the drawer closes
  // without an effect.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === location.key;
  const { setOpen: setPaletteOpen } = useCommandPalette();

  // Close the sheet first and open the palette once its focus trap has let go.
  const openSearch = () => {
    setOpenAt(null);
    window.setTimeout(() => setPaletteOpen(true), 220);
  };

  return (
    <Drawer open={open} onOpenChange={next => setOpenAt(next ? location.key : null)}>
      <DrawerTrigger
        aria-label="Open the menu"
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), className)}
      >
        <Menu aria-hidden="true" strokeWidth={1.75} />
      </DrawerTrigger>
      <DrawerContent data-testid="mobile-nav">
        <div className="flex items-center justify-between gap-3 px-5 pt-1 pb-2">
          <span className="inline-flex items-center gap-2.5">
            <Emblem className="size-6" />
            <Wordmark className="h-3" title={null} />
          </span>
          <DrawerCloseButton className="-mr-2" />
        </div>
        <DrawerTitle className="sr-only">Menu</DrawerTitle>
        <DrawerDescription className="sr-only">
          Pages of DualMind Arena, the color theme and sign in.
        </DrawerDescription>
        <div className="px-5 pt-2">
          <button
            type="button"
            onClick={openSearch}
            aria-haspopup="dialog"
            className="flex min-h-12 w-full press cursor-pointer items-center gap-3 rounded-full border border-line bg-bg-deep px-4 text-left text-ui text-muted shadow-[inset_0_1px_2px_color-mix(in_oklab,black_18%,transparent)] hover:border-line-strong hover:text-fg"
          >
            <Search aria-hidden="true" className="size-4.5" strokeWidth={1.75} />
            <span className="flex-1">Search pages and commands</span>
          </button>
        </div>
        <nav aria-label={label} className="px-3 pt-3">
          <ul className="grid gap-1">
            {primaryNav.map((link, index) => {
              const active = isActivePath(link.href, path);
              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className="group/link relative flex min-h-16 press items-center gap-4 rounded-xl border border-transparent px-3 py-2.5 transition-colors duration-(--dur-fast) ease-out-expo before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full before:bg-mind-a before:opacity-0 hover:bg-hover aria-[current=page]:border-line aria-[current=page]:bg-surface-2 aria-[current=page]:shadow-raise aria-[current=page]:before:opacity-100"
                  >
                    <span
                      aria-hidden="true"
                      className="w-6 shrink-0 numeric font-mono text-caption text-muted group-aria-[current=page]/link:text-mind-a"
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="grid flex-1 gap-0.5">
                      <span className="text-lead font-semibold tracking-tight text-fg">
                        {link.label}
                      </span>
                      {link.description ? (
                        <span className="text-caption text-muted">{link.description}</span>
                      ) : null}
                    </span>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted transition-transform duration-(--dur-fast) ease-out-expo group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
                      strokeWidth={1.75}
                    />
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mx-5 mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
          <span className="eyebrow text-muted">Theme</span>
          <ThemeToggle />
        </div>
        <div className="grid gap-4 px-5 pt-5 pb-6">
          {hideSignIn ? null : (
            <a
              href={signInLink.href}
              className={cn(buttonVariants({ variant: 'primary', size: 'md' }), 'w-full')}
            >
              {signInLink.label}
            </a>
          )}
          <ul className="flex flex-wrap justify-center gap-x-2 gap-y-1 text-caption text-muted">
            {smallLinks.map(link => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="inline-flex min-h-8 items-center rounded-sm px-2 hover:text-fg pointer-coarse:min-h-11 pointer-coarse:min-w-11 pointer-coarse:justify-center"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
