import { Check, ChevronsUpDown, Dices } from 'lucide-react';
import { useState } from 'react';

import { RoleBadge } from '@/components/ui/role-badge';
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
import { cn } from '@/lib/utils/cn';

import type { ModelOption } from '../hooks/use-model-options';

export interface ModelPickerProps {
  /** `a` or `b` in Side by side; `solo` in Direct. */
  side: 'a' | 'b' | 'solo';
  options: readonly ModelOption[] | undefined;
  value: ModelOption | null;
  onChange: (model: ModelOption | null) => void;
  /** The label for screen readers: "Model for answer A". */
  label: string;
  disabled?: boolean;
}

const RANDOM = '__random__';

/**
 * A model picker on cmdk in a popover (the shadcn Model Selector pattern): search by name or
 * provider, rank and Elo on the right, and "Random" at the top.
 */
export function ModelPicker({ side, options, value, onChange, label, disabled }: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const choose = (model: ModelOption | null) => {
    onChange(model);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`${label}: ${value ? value.displayName : 'random'}`}
        disabled={disabled ?? options === undefined}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'xs' }),
          'h-8 max-w-56 justify-between gap-1.5 rounded-full border border-line px-2 text-ui-sm font-normal text-fg-soft pointer-coarse:h-10',
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {side === 'solo' ? null : <RoleBadge who={side} letterOnly size="sm" />}
          <span className="truncate">{value ? value.displayName : 'Random'}</span>
        </span>
        <ChevronsUpDown aria-hidden="true" className="size-3.5 text-muted" strokeWidth={1.75} />
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-80 p-0">
        <Command label={label} loop className="rounded-lg">
          <CommandInput placeholder="Search models" />
          <CommandList className="max-h-72">
            <CommandEmpty>No model matches.</CommandEmpty>
            <CommandGroup>
              <CommandItem value={RANDOM} keywords={['random', 'any', 'surprise']} onSelect={() => choose(null)}>
                <Dices aria-hidden="true" strokeWidth={1.75} />
                Random
                <Check
                  aria-hidden="true"
                  strokeWidth={2.25}
                  className={cn('ml-auto text-mind-a', value === null ? 'opacity-100' : 'opacity-0')}
                />
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Models">
              {(options ?? []).map(option => (
                <CommandItem
                  key={option.modelId}
                  value={option.modelId}
                  keywords={[option.displayName, option.provider, option.modelName]}
                  onSelect={() => choose(option)}
                >
                  <Check
                    aria-hidden="true"
                    strokeWidth={2.25}
                    className={cn(
                      'text-mind-a',
                      value?.modelId === option.modelId ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{option.displayName}</span>
                  <CommandShortcut className="font-mono tabular-nums">
                    {option.rank === null ? option.provider : `#${option.rank} · ${Math.round(option.elo ?? 0)}`}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
