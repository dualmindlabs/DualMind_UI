import { Check, Circle, LoaderCircle, ShieldAlert, ShieldCheck } from 'lucide-react';

import {
  evaluatePassword,
  PASSWORD_RULES,
  type PasswordStrength,
  STRENGTH_LABELS,
} from '@/lib/supabase';
import { cn } from '@/lib/utils/cn';

import type { BreachState } from '../hooks/use-breach-check';

/** How many of the four segments are lit, and in which tone. */
const METER: Record<PasswordStrength, { lit: number; tone: string }> = {
  empty: { lit: 0, tone: 'bg-line-strong' },
  'too-weak': { lit: 1, tone: 'bg-bad' },
  weak: { lit: 1, tone: 'bg-bad' },
  fair: { lit: 2, tone: 'bg-warn' },
  good: { lit: 3, tone: 'bg-warn' },
  strong: { lit: 4, tone: 'bg-ok' },
};

function BreachLine({ state }: { state: BreachState }) {
  switch (state.status) {
    case 'idle':
      return (
        <>
          <Circle aria-hidden="true" className="size-3.5 text-muted" />
          Checked against known data breaches once the rules pass
        </>
      );
    case 'checking':
      return (
        <>
          <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin text-muted" />
          Checking known data breaches
        </>
      );
    case 'clean':
      return (
        <>
          <ShieldCheck aria-hidden="true" className="size-3.5 text-ok" />
          Not found in known data breaches
        </>
      );
    case 'pwned':
      return (
        <>
          <ShieldAlert aria-hidden="true" className="size-3.5 text-bad" />
          <span className="text-fg">
            Found in {state.count.toLocaleString('en')} data breaches. Choose a different one.
          </span>
        </>
      );
    case 'unavailable':
      return (
        <>
          <Circle aria-hidden="true" className="size-3.5 text-muted" />
          The breach check is unavailable right now
        </>
      );
  }
}

/**
 * The strength meter, the rule checklist and the breach check under a new password. The id is
 * referenced by the password input's aria-describedby, so the rules are read with the field.
 */
export function PasswordStrengthHint({
  id,
  password,
  breach,
}: {
  id: string;
  password: string;
  breach: BreachState;
}) {
  const evaluation = evaluatePassword(password);
  const meter = METER[evaluation.strength];
  return (
    <div id={id} className="grid gap-2.5 text-caption text-muted">
      <div className="flex items-center gap-3">
        <div className="grid flex-1 grid-cols-4 gap-1.5" aria-hidden="true">
          {[1, 2, 3, 4].map(step => (
            <div key={step} className="h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div
                className={cn(
                  'h-full origin-left rounded-full transition-transform duration-(--dur-base) ease-out-expo',
                  meter.tone,
                  step <= meter.lit ? 'scale-x-100' : 'scale-x-0',
                )}
              />
            </div>
          ))}
        </div>
        <p className="min-w-16 text-right font-medium text-fg-soft">
          <span className="sr-only">Strength: </span>
          {STRENGTH_LABELS[evaluation.strength]}
        </p>
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {PASSWORD_RULES.map(rule => {
          const met = evaluation.checks[rule.key];
          return (
            <li key={rule.key} className={cn('flex items-center gap-1.5', met && 'text-fg-soft')}>
              {met ? (
                <Check aria-hidden="true" className="size-3.5 text-ok" />
              ) : (
                <Circle aria-hidden="true" className="size-3.5" />
              )}
              {rule.label}
              <span className="sr-only">{met ? ' (done)' : ' (missing)'}</span>
            </li>
          );
        })}
      </ul>
      <p className="flex items-center gap-1.5">
        <BreachLine state={breach} />
      </p>
    </div>
  );
}
