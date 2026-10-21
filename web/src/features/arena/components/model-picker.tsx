import { Check, ChevronsUpDown, Dices } from 'lucide-react';
import { type RefObject, useRef, useState } from 'react';

import { buttonVariants } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RoleBadge } from '@/components/ui/role-badge';
import { formatElo } from '@/features/leaderboard';
import { cn } from '@/lib/utils/cn';

import type { ModelOption } from '../hooks/use-model-options';
import { groupModelOptions } from '../lib/model-groups';
import { DEFAULT_PICKER_PADDING, pickerPadding } from '../lib/picker-placement';

export interface ModelPickerProps {
  /** `a` or `b` in Side by side; `solo` in Direct. */
  side: 'a' | 'b' | 'solo';
  options: readonly ModelOption[] | undefined;
  value: ModelOption | null;
  onChange: (model: ModelOption | null) => void;
  /** The label for screen readers: "Model for answer A". */
  label: string;
  disabled?: boolean;
  /** Where the list opens when there is room: under the hero composer, above the docked one. */
  placement?: 'top' | 'bottom';
  /** An element the open list must not cover: the empty arena's heading. */
  avoidRef?: RefObject<HTMLElement | null> | undefined;
}

const RANDOM = '__random__';

/** Flip between above and below, slide sideways to fit, never jump to the left or right. */
const COLLISION_AVOIDANCE = { side: 'flip', align: 'shift', fallbackAxisSide: 'none' } as const;

function Selected({ on }: { on: boolean }) {
  return (
    <Check
      aria-hidden="true"
      strokeWidth={2.25}
      className={cn('text-mind-a', on ? 'opacity-100' : 'opacity-0')}
    />
  );
}

function ModelItem({
  option,
  selected,
  onSelect,
}: {
  option: ModelOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <CommandItem
      value={option.modelId}
      keywords={[option.displayName, option.provider, option.modelName]}
      onSelect={onSelect}
      // The serving platform's id, for the curious (the same tooltip as on the leaderboard).
      title={option.modelName}
      data-testid="model-option"
      className="py-1.5"
    >
      <Selected on={selected} />
      <span className="grid min-w-0 flex-1">
        <span className="truncate">{option.displayName}</span>
        <span className="truncate text-caption text-muted">{option.provider}</span>
      </span>
      {option.rank === null ? null : (
        <CommandShortcut className="shrink-0 font-mono tabular-nums">
          <span className="sr-only">Rank </span>#{option.rank}
          <span aria-hidden="true">·</span>
          <span className="sr-only">, Elo </span>
          {formatElo(option.elo ?? 0)}
        </CommandShortcut>
      )}
    </CommandItem>
  );
}

/**
 * A model picker on cmdk in a popover (the shadcn Model Selector pattern): search by name, maker
 * or id, "Random" at the top, then the ranked models with their rank and Elo, then the models not
 * yet rated, without numbers (the leaderboard's rule). Names are the human ones; the raw id is in
 * the tooltip. The list opens under the hero composer and above the docked one, flips and shrinks
 * to fit, and never covers the heading passed as `avoidRef` (lib/picker-placement.ts).
 */
export function ModelPicker({
  side,
  options,
  value,
  onChange,
  label,
  disabled,
  placement = 'top',
  avoidRef,
}: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [padding, setPadding] = useState(DEFAULT_PICKER_PADDING);
  const trigger = useRef<HTMLButtonElement>(null);
  const { rated, unrated } = groupModelOptions(options);

  const changeOpen = (next: boolean) => {
    if (next) {
      setPadding(
        pickerPadding(
          avoidRef?.current?.getBoundingClientRect() ?? null,
          trigger.current?.getBoundingClientRect() ?? null,
          window.innerHeight,
        ),
      );
    }
    setOpen(next);
  };

  const choose = (model: ModelOption | null) => {
    onChange(model);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger
        ref={trigger}
        aria-label={`${label}: ${value ? value.displayName : 'random'}`}
        title={value?.modelName}
        disabled={disabled ?? options === undefined}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'xs' }),
          'h-8 max-w-56 justify-between gap-1.5 rounded-full border border-line px-2 text-ui-sm font-normal text-fg-soft hover:border-line-strong pointer-coarse:h-11',
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {side === 'solo' ? null : <RoleBadge who={side} letterOnly size="sm" />}
          <span className="truncate">{value ? value.displayName : 'Random'}</span>
        </span>
        <ChevronsUpDown aria-hidden="true" className="size-3.5 text-muted" strokeWidth={1.75} />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side={placement}
        collisionPadding={padding}
        collisionAvoidance={COLLISION_AVOIDANCE}
        data-testid="model-picker"
        className="max-h-[min(28rem,var(--available-height))] w-[min(22rem,calc(100vw-1rem))] gap-0 overflow-hidden p-0"
      >
        <Command label={label} loop className="min-h-0 flex-1 rounded-lg">
          <CommandInput placeholder="Search models" />
          <CommandList className="max-h-80">
            <CommandEmpty>No model matches.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={RANDOM}
                keywords={['random', 'any', 'surprise']}
                onSelect={() => choose(null)}
              >
                <Selected on={value === null} />
                <Dices aria-hidden="true" strokeWidth={1.75} />
                Random
              </CommandItem>
            </CommandGroup>
            {rated.length > 0 ? (
              <CommandGroup heading="Ranked">
                {rated.map(option => (
                  <ModelItem
                    key={option.modelId}
                    option={option}
                    selected={value?.modelId === option.modelId}
                    onSelect={() => choose(option)}
                  />
                ))}
              </CommandGroup>
            ) : null}
            {unrated.length > 0 ? (
              <CommandGroup heading="Not yet rated">
                {unrated.map(option => (
                  <ModelItem
                    key={option.modelId}
                    option={option}
                    selected={value?.modelId === option.modelId}
                    onSelect={() => choose(option)}
                  />
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
