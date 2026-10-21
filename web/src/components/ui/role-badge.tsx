/**
 * The three roles of a battle as badges: Mind A and Mind B with their A / B letters (colour is
 * never the only signal, design-direction.md section 2) and the human ("You").
 * Our own component, styled like ./badge.tsx.
 */
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

export type BattleRole = 'a' | 'b' | 'human';

const roleStyles: Record<
  BattleRole,
  { letter: string; name: string; badge: string; chip: string; text: string }
> = {
  a: {
    letter: 'A',
    name: 'Mind A',
    badge: 'border-mind-a/45 bg-mind-a-tint',
    chip: 'bg-mind-a text-on-accent',
    text: 'text-mind-a',
  },
  b: {
    letter: 'B',
    name: 'Mind B',
    badge: 'border-mind-b/55 bg-mind-b-tint',
    // The text violet as the fill: ink on #A78BFA is 7.3:1, ink on the fill violet would be 4.3:1.
    chip: 'bg-mind-b-text text-on-accent',
    text: 'text-mind-b-text',
  },
  human: {
    letter: 'You',
    name: 'You',
    badge: 'border-human/50 bg-human-tint',
    chip: 'bg-human text-on-accent',
    text: 'text-human',
  },
};

export interface RoleBadgeProps {
  /** Which role: Mind A (`a`), Mind B (`b`) or the person voting (`human`). */
  who: BattleRole;
  /** Replaces the role name, for example the model's name after the reveal. */
  label?: ReactNode;
  /** Only the letter (or "You"), with the role name for screen readers. */
  letterOnly?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function RoleBadge({
  who: role,
  label,
  letterOnly = false,
  size = 'md',
  className,
}: RoleBadgeProps) {
  const style = roleStyles[role];

  if (letterOnly) {
    return (
      <span
        data-slot="role-badge"
        data-role={role}
        className={cn(
          'inline-grid shrink-0 place-items-center rounded-sm border font-mono font-medium',
          role === 'human' ? 'h-6 px-1.5' : 'size-6',
          size === 'sm' && (role === 'human' ? 'h-5 px-1 text-caption' : 'size-5 text-caption'),
          size === 'md' && 'text-ui-sm',
          style.badge,
          style.text,
          className,
        )}
      >
        {role === 'human' ? (
          style.letter
        ) : (
          <>
            <span aria-hidden="true">{style.letter}</span>
            <span className="sr-only">{style.name}</span>
          </>
        )}
      </span>
    );
  }

  return (
    <span
      data-slot="role-badge"
      data-role={role}
      className={cn(
        'inline-flex w-fit shrink-0 items-center rounded-full border font-medium whitespace-nowrap',
        size === 'md'
          ? 'h-7 gap-2 pr-3 pl-0.5 text-ui-sm'
          : 'h-6 gap-1.5 pr-2.5 pl-0.5 text-caption',
        role === 'human' && (size === 'md' ? 'pl-2.5' : 'pl-2'),
        style.badge,
        className,
      )}
    >
      {role === 'human' ? (
        <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-human" />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'grid shrink-0 place-items-center rounded-full font-mono font-medium',
            size === 'md' ? 'size-6 text-ui-sm' : 'size-5 text-caption',
            style.chip,
          )}
        >
          {style.letter}
        </span>
      )}
      <span className={style.text}>
        {label ?? style.name}
        {label !== undefined && role !== 'human' ? (
          <span className="sr-only"> ({style.name})</span>
        ) : null}
      </span>
    </span>
  );
}
