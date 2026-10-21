import { Check, type LucideIcon } from 'lucide-react';
import { type ReactNode, useId } from 'react';

import { cn } from '@/lib/utils/cn';

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  description?: ReactNode;
  icon?: LucideIcon;
  /** A picture above the label (the theme previews). Decorative: hidden from screen readers. */
  preview?: ReactNode;
}

export interface ChoiceCardsProps<T extends string> {
  /** The group's name for screen readers (the card title usually shows it). */
  legend: string;
  value: T;
  options: ReadonlyArray<ChoiceOption<T>>;
  onChange: (value: T) => void;
  /** Columns from `sm` up; phones always stack (or two columns for five short options). */
  columns?: 2 | 3 | 5;
  describedBy?: string;
  className?: string;
}

const COLUMNS = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
} as const;

/**
 * A choice between a few options as cards: a native radio group under the hood, so arrow keys
 * move and select, the group has a legend, and each radio is named by its label alone (its
 * description is announced as the description). The chosen card carries the Mind A edge and a
 * check, never colour alone.
 */
export function ChoiceCards<T extends string>({
  legend,
  value,
  options,
  onChange,
  columns = 3,
  describedBy,
  className,
}: ChoiceCardsProps<T>) {
  const name = useId();
  return (
    <fieldset aria-describedby={describedBy} className={cn('grid gap-3', COLUMNS[columns], className)}>
      <legend className="sr-only">{legend}</legend>
      {options.map(option => {
        const checked = option.value === value;
        const labelId = `${name}-${option.value}-label`;
        const descriptionId = `${name}-${option.value}-description`;
        const Icon = option.icon;
        return (
          <label
            key={option.value}
            data-checked={checked ? '' : undefined}
            className={cn(
              'relative grid cursor-pointer content-start gap-2 rounded-lg border bg-surface-2 p-3.5 focus-ring-within pointer-coarse:min-h-14',
              'transition-[border-color,background-color,box-shadow] duration-(--dur-fast) ease-out-expo',
              checked
                ? 'border-mind-a bg-mind-a-tint shadow-[inset_0_0_0_1px_var(--mind-a)]'
                : 'border-line hover:border-line-strong hover:bg-surface-3',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              aria-labelledby={labelId}
              aria-describedby={option.description ? descriptionId : undefined}
              className="sr-only"
            />
            {option.preview ? <span aria-hidden="true">{option.preview}</span> : null}
            <span className="flex min-w-0 items-center gap-2">
              {Icon ? (
                <Icon
                  aria-hidden="true"
                  strokeWidth={1.75}
                  className={cn('size-4 shrink-0', checked ? 'text-mind-a' : 'text-fg-soft')}
                />
              ) : null}
              <span id={labelId} className="min-w-0 text-ui-sm font-medium text-fg">
                {option.label}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  'ml-auto grid size-4.5 shrink-0 place-items-center rounded-full border transition-colors duration-(--dur-fast)',
                  checked ? 'border-mind-a bg-mind-a text-on-accent' : 'border-line-strong',
                )}
              >
                {checked ? <Check className="size-3" strokeWidth={3} /> : null}
              </span>
            </span>
            {option.description ? (
              <span id={descriptionId} className="text-caption text-muted">
                {option.description}
              </span>
            ) : null}
          </label>
        );
      })}
    </fieldset>
  );
}
