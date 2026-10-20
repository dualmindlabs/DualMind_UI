import { ArrowUpRight, Menu } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'react-router';

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
import { footerColumns, isActivePath, primaryNav, signInLink } from '@/lib/site/links';
import { cn } from '@/lib/utils/cn';

export interface MobileNavProps {
  /** The current path, for aria-current; defaults to the router's location. */
  activePath?: string;
  /** The landmark's name inside the drawer. */
  label?: string;
  className?: string;
}

const smallLinks = footerColumns.flatMap(column => column.links).filter(link =>
  ['/about/', '/faq/', '/privacy/', '/terms/'].includes(link.href),
);

/**
 * The phone menu: a button that opens a bottom drawer (swipe down, Esc or the close button to
 * dismiss) with the main links, the theme switch and sign in. Focus is trapped inside while it is
 * open and returns to the menu button. It closes by itself when the route changes.
 */
export function MobileNav({ activePath, label = 'Main', className }: MobileNavProps) {
  const location = useLocation();
  const path = activePath ?? location.pathname;
  // Open "for" one location: when the route changes the key differs, so the drawer closes
  // without an effect.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === location.key;

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
          <Wordmark className="h-3" title={null} />
          <DrawerCloseButton className="-mr-2" />
        </div>
        <DrawerTitle className="sr-only">Menu</DrawerTitle>
        <DrawerDescription className="sr-only">
          Pages of DualMind Arena, the colour theme and sign in.
        </DrawerDescription>
        <nav aria-label={label} className="px-3 pt-2">
          <ul className="grid gap-1">
            {primaryNav.map(link => {
              const active = isActivePath(link.href, path);
              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className="group/link flex min-h-14 items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors duration-(--dur-fast) ease-out-expo hover:bg-hover aria-[current=page]:bg-hover"
                  >
                    <span className="grid gap-0.5">
                      <span className="flex items-center gap-2 text-ui font-medium text-fg">
                        {link.label}
                        {active ? (
                          <span aria-hidden="true" className="size-1.5 rounded-full bg-mind-a" />
                        ) : null}
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
          <a
            href={signInLink.href}
            className={cn(buttonVariants({ variant: 'primary', size: 'md' }), 'w-full')}
          >
            {signInLink.label}
          </a>
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-caption text-muted">
            {smallLinks.map(link => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="inline-flex min-h-6 items-center rounded-sm hover:text-fg"
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
