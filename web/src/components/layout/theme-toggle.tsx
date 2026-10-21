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

export interface ThemeToggleProps {
  className?: string;
  /** Icons only at every width (the header); the labels stay readable by screen readers. */
  compact?: boolean;
}

/**
 * System / Dark / Light as a native radio group, so arrow keys move between the options. The
 * choice is stored in localStorage (`dm.theme`) and applied at once; on the next visit the inline
 * theme script applies it before the first paint.
 */
export function ThemeToggle({ className, compact = false }: ThemeToggleProps) {
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
          title={compact ? `${label} theme` : undefined}
          className={cn(
            'hit-area relative inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full text-ui-sm text-muted focus-ring-within transition-colors duration-(--dur-fast) ease-out-expo hover:text-fg has-checked:bg-surface-2 has-checked:text-fg has-checked:shadow-raise',
            compact
              ? 'size-7'
              : 'h-8 min-w-8 px-2 sm:px-3 pointer-coarse:h-11 pointer-coarse:min-w-11',
          )}
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
          <span className={compact ? 'sr-only' : 'max-sm:sr-only'}>{label}</span>
        </label>
      ))}
    </fieldset>
  );
}
