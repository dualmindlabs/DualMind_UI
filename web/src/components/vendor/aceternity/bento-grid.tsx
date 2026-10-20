/**
 * Bento Grid, from Aceternity UI (free tier).
 * Source: https://ui.aceternity.com/registry/bento-grid.json (copied 2026-10-20)
 * Licence: Aceternity UI licence, https://ui.aceternity.com/licence (see ./LICENSE-NOTES.md).
 * Our changes:
 * - Design tokens instead of the neutral palette; our radius, surfaces and depth.
 * - The grid is a list (<ul>/<li>) and each title a heading whose level the caller sets.
 * - The hover nudge also runs on keyboard focus inside a card; it is a transform only and
 *   reduced motion turns it off (motion-safe). No @tabler/icons dependency: pass any icon.
 * - Both components in one file, as in the source.
 */
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

export function BentoGrid({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <ul
      className={cn(
        'mx-auto grid max-w-page grid-cols-1 gap-4 md:auto-rows-[18rem] md:grid-cols-3',
        className,
      )}
    >
      {children}
    </ul>
  );
}

export interface BentoGridItemProps {
  className?: string;
  title: ReactNode;
  description?: ReactNode;
  /** Visual at the top of the card (decorative unless it says otherwise). */
  header?: ReactNode;
  icon?: ReactNode;
  titleAs?: 'h3' | 'h4' | 'h5' | 'p';
  /** Extra layers inside the card, such as GlowingEffect. */
  children?: ReactNode;
}

export function BentoGridItem({
  className,
  title,
  description,
  header,
  icon,
  titleAs: Title = 'h3',
  children,
}: BentoGridItemProps) {
  return (
    <li
      className={cn(
        'group/bento relative row-span-1 flex flex-col justify-between gap-4 rounded-lg border border-line bg-surface p-4 shadow-raise transition-shadow duration-(--dur-base) hover:shadow-raise-strong',
        className,
      )}
    >
      {children}
      {header}
      <div className="transition-transform duration-(--dur-base) ease-out-expo motion-safe:group-focus-within/bento:translate-x-2 motion-safe:group-hover/bento:translate-x-2">
        {icon}
        <Title className="mt-2 mb-1.5 text-ui font-semibold text-fg">{title}</Title>
        {description ? <div className="text-ui-sm text-fg-soft">{description}</div> : null}
      </div>
    </li>
  );
}
