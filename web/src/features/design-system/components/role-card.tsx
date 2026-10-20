import { cn } from '@/lib/utils/cn';
import { tokenValue } from '@/styles/tokens';

import { roleStyles } from '../lib/roles';
import type { Role } from '../types';

interface RoleCardProps {
  side: Role;
  token: `--${string}`;
  meaning: string;
  rule: string;
}

export function RoleCard({ side, token, meaning, rule }: RoleCardProps) {
  const style = roleStyles[side];
  return (
    <li className="relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface p-5 shadow-raise">
      <span aria-hidden="true" className={cn('absolute inset-x-0 top-0 h-0.5', style.fill)} />
      <div className="flex items-center justify-between gap-3">
        <h3 className={cn('text-h3 font-semibold', style.text)}>{style.name}</h3>
        <span
          aria-hidden="true"
          className={cn(
            'inline-grid h-6 min-w-6 place-items-center rounded-sm border px-1.5 font-mono text-ui-sm font-medium',
            style.tint,
            style.text,
            style.border,
          )}
        >
          {style.letter}
        </span>
      </div>
      <p className="mt-3 text-ui text-fg">{meaning}</p>
      <p className="mt-2 text-ui-sm text-fg-soft">{rule}</p>
      <p className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-5 font-code text-caption text-muted uppercase">
        <span>Dark {tokenValue(token, 'dark')}</span>
        <span>Light {tokenValue(token, 'light')}</span>
      </p>
    </li>
  );
}
