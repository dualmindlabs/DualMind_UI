import { useId, useState } from 'react';

import { AnimatedBackground } from '@/components/vendor/motion-primitives/animated-background';

import { EffectFrame } from './effect-frame';

const modes = [
  { id: 'battle', label: 'Battle' },
  { id: 'side', label: 'Side by side' },
  { id: 'direct', label: 'Direct' },
] as const;

type Mode = (typeof modes)[number]['id'];

/**
 * Animated Background as the arena's mode switch: a real radio group (arrow keys move between
 * the modes), with the highlight sliding behind the checked one.
 */
export function EffectDemoModeSwitch() {
  const name = useId();
  const [mode, setMode] = useState<Mode>('battle');

  return (
    <EffectFrame effect="animated-background">
      <fieldset className="grid justify-items-center gap-3">
        <legend className="sr-only">Mode</legend>
        <div className="inline-flex rounded-full border border-line bg-surface-2 p-1 shadow-raise">
          <AnimatedBackground
            value={mode}
            className="rounded-full bg-mind-a-tint ring-1 ring-mind-a/45"
          >
            {modes.map(option => (
              <label
                key={option.id}
                data-id={option.id}
                className="h-9 cursor-pointer items-center rounded-full px-3.5 text-ui-sm font-medium text-fg-soft focus-ring-within transition-colors duration-(--dur-fast) data-[checked=true]:text-fg"
              >
                <input
                  type="radio"
                  name={name}
                  value={option.id}
                  checked={mode === option.id}
                  onChange={() => setMode(option.id)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </AnimatedBackground>
        </div>
        <p className="text-caption text-muted">Use the arrow keys or click a mode.</p>
      </fieldset>
    </EffectFrame>
  );
}
