import { Check, Circle, LoaderCircle, ShieldAlert, ShieldCheck } from 'lucide-react';

import {
  evaluatePassword,
  PASSWORD_RULES,
  type PasswordStrength,
  STRENGTH_LABELS,
} from '@/lib/supabase';
import { cn } from '@/lib/utils/cn';

import type { BreachState } from '../hooks/use-breach-check';

const METER: Record<PasswordStrength, { width: string; tone: string }> = {
  empty: { width: 'w-0', tone: 'bg-line-strong' },
  'too-weak': { width: 'w-1/12', tone: 'bg-bad' },
  weak: { width: 'w-2/6', tone: 'bg-bad' },
  fair: { width: 'w-3/6', tone: 'bg-warn' },
  good: { width: 'w-4/6', tone: 'bg-warn' },
  strong: { width: 'w-full', tone: 'bg-ok' },
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
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
          <div
            className={cn(
              'h-full rounded-full transition-[width,background-color] duration-(--dur-base) ease-out-expo',
              meter.width,
              meter.tone,
            )}
          />
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
