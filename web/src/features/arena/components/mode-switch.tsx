import { useId } from 'react';

import { AnimatedBackground } from '@/components/vendor/motion-primitives/animated-background';
import { cn } from '@/lib/utils/cn';

import { ARENA_MODES, type ArenaMode, MODE_DETAILS } from '../lib/modes';
import { PRESSABLE } from '../lib/press';

export interface ModeSwitchProps {
  value: ArenaMode;
  onChange: (mode: ArenaMode) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Battle, Side by side or Direct: a native radio group (arrow keys move between the modes) with
 * the Motion Primitives highlight sliding behind the checked one on a spring. Each mode presses
 * like the kit's buttons (lib/press.ts) and is 44px tall on touch screens; while answers arrive
 * the whole switch dims and rests.
 */
export function ModeSwitch({ value, onChange, disabled = false, className }: ModeSwitchProps) {
  const name = useId();
  return (
    <fieldset
      disabled={disabled}
      className={cn(
        'inline-flex rounded-full border border-line bg-surface p-0.5 transition-opacity duration-(--dur-fast) disabled:opacity-60',
        className,
      )}
    >
      <legend className="sr-only">Mode</legend>
      <AnimatedBackground
        value={value}
        className="rounded-full bg-mind-a-tint ring-1 ring-mind-a/45"
      >
        {ARENA_MODES.map(mode => (
          <label
            key={mode}
            data-id={mode}
            title={MODE_DETAILS[mode].description}
            className={cn(
              'h-8 items-center rounded-full px-3 text-ui-sm font-medium whitespace-nowrap text-fg-soft focus-ring-within data-[checked=true]:text-fg pointer-coarse:h-11',
              // While answers arrive the switch rests: no hover, no press.
              disabled ? 'cursor-not-allowed' : cn('cursor-pointer hover:text-fg', PRESSABLE),
            )}
          >
            <input
              type="radio"
              name={name}
              value={mode}
              checked={value === mode}
              onChange={() => onChange(mode)}
              className="sr-only"
            />
            {MODE_DETAILS[mode].label}
          </label>
        ))}
      </AnimatedBackground>
    </fieldset>
  );
}
