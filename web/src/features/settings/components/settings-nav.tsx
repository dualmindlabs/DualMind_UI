import { Database, Keyboard, type LucideIcon, Palette, Swords, UserRound } from 'lucide-react';
import type { MouseEvent } from 'react';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils/cn';

import { useActiveSection } from '../hooks/use-active-section';
import { SETTINGS_SECTIONS, type SettingsSectionId } from '../lib/sections';

const ICONS: Record<SettingsSectionId, LucideIcon> = {
  profile: UserRound,
  appearance: Palette,
  arena: Swords,
  shortcuts: Keyboard,
  data: Database,
};

const IDS = SETTINGS_SECTIONS.map(section => section.id);

/**
 * Moves to a section: scrolls it into view (at once under reduced motion), puts its #id in the
 * address without a history entry (a plain fragment link would also reach the router as a POP
 * navigation and its scroll restoration), and moves focus there for keyboard and screen reader
 * users.
 */
export function goToSection(id: string, smooth: boolean): boolean {
  const target = document.getElementById(id);
  if (!target) return false;
  target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  window.history.replaceState(window.history.state, '', `#${id}`);
  target.focus({ preventScroll: true });
  return true;
}

/**
 * The section nav: a sticky column on wide screens that marks the section you are reading
 * (`aria-current="location"`), and a wrapping row of links above the sections on phones.
 * In-page links (they work without JavaScript too), handled by goToSection().
 */
export function SettingsNav({ className }: { className?: string }) {
  const active = useActiveSection(IDS);
  const reduce = useReducedMotion();
  const onClick = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    // New tabs and windows keep the browser's own handling.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    if (goToSection(id, !reduce)) event.preventDefault();
  };
  return (
    <nav aria-label="Settings sections" className={className}>
      <ul className="flex flex-wrap gap-2 lg:grid lg:gap-0.5">
        {SETTINGS_SECTIONS.map(section => {
          const Icon = ICONS[section.id];
          const current = active === section.id;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={current ? 'location' : undefined}
                onClick={event => onClick(event, section.id)}
                className={cn(
                  'flex h-9 items-center gap-2.5 rounded-md border px-3 text-ui-sm font-medium whitespace-nowrap transition-colors duration-(--dur-fast) ease-out-expo pointer-coarse:h-11',
                  'max-lg:rounded-full',
                  current
                    ? 'border-line bg-surface-2 text-fg shadow-raise'
                    : 'border-transparent text-fg-soft hover:bg-hover hover:text-fg max-lg:border-line',
                )}
              >
                <Icon
                  aria-hidden="true"
                  strokeWidth={1.75}
                  className={cn('size-4', current ? 'text-mind-a' : 'text-muted')}
                />
                {section.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
