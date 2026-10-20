import { type LucideIcon, Monitor, Moon, Sun } from 'lucide-react';
import { useId } from 'react';

import { useTheme } from '@/hooks/use-theme';
import type { ThemePreference } from '@/lib/theme/theme';
import { cn } from '@/lib/utils/cn';

const OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string; icon: LucideIcon }> = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
];

/**
 * System / Dark / Light as a native radio group, so arrow keys move between the options. The
 * choice is stored in localStorage (`dm.theme`) and applied at once; on the next visit the inline
 * theme script applies it before the first paint.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme();
  const name = useId();

  return (
    <fieldset
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5',
        className,
      )}
    >
      <legend className="sr-only">Colour theme</legend>
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <label
          key={value}
          className="focus-ring-within relative inline-flex h-8 min-w-8 cursor-pointer items-center justify-center gap-1.5 rounded-full px-2 text-ui-sm text-muted transition-colors duration-(--dur-fast) ease-out-expo hover:text-fg has-checked:bg-surface-2 has-checked:text-fg has-checked:shadow-raise sm:px-3"
        >
          <input
            type="radio"
            name={name}
            value={value}
            checked={preference === value}
            onChange={() => setPreference(value)}
            className="sr-only"
          />
          <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
          <span className="max-sm:sr-only">{label}</span>
        </label>
      ))}
    </fieldset>
  );
}
