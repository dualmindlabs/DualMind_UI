import { Database, Keyboard, type LucideIcon, Palette, Swords, UserRound } from 'lucide-react';

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
 * The section nav: a sticky column on wide screens that marks the section you are reading
 * (`aria-current="location"`), and a wrapping row of links above the sections on phones.
 * Plain in-page links, so the browser handles focus and the address keeps the #section.
 */
export function SettingsNav({ className }: { className?: string }) {
  const active = useActiveSection(IDS);
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
