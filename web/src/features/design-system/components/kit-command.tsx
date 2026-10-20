import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils/cn';

import { KitCard } from './kit-card';

const groups = [
  {
    heading: 'Frontier',
    models: [
      { name: 'Atlas 2', elo: '1,284', note: 'Reasoning' },
      { name: 'Borealis', elo: '1,247' },
    ],
  },
  {
    heading: 'Open weights',
    models: [
      { name: 'Cirrus Pro', elo: '1,201' },
      { name: 'Delta Mini', elo: '1,188' },
      { name: 'Ember 4', elo: '1,163', unavailable: true },
    ],
  },
] as const;

/**
 * The command list as the arena's model picker: a popover with a filterable list. (An inline
 * list would scroll the page on load: cmdk scrolls its first item into view when it mounts.)
 */
export function KitCommand() {
  const [model, setModel] = useState('Atlas 2');
  const [open, setOpen] = useState(false);

  return (
    <KitCard
      title="Command list"
      source="@/components/ui/command"
      description="A filterable list driven from one text field: arrow keys move, Enter picks. The command palette and this model picker are built on it."
    >
      <div className="grid gap-2.5">
        <p className="text-ui-sm font-medium text-fg">Side by side: pick Mind A</p>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            className={cn(
              buttonVariants({ variant: 'secondary', size: 'md' }),
              'w-full max-w-sm justify-between rounded-sm px-3',
            )}
          >
            <span className="flex items-center gap-2.5">
              <RoleBadge who="a" letterOnly size="sm" />
              {model}
            </span>
            <ChevronsUpDown aria-hidden="true" className="text-muted" strokeWidth={1.75} />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-(--anchor-width) max-w-sm min-w-72 p-0">
            <Command label="Pick a model for Mind A" loop className="rounded-lg">
              <CommandInput placeholder="Search models" />
              <CommandList className="max-h-72">
                <CommandEmpty>No model matches.</CommandEmpty>
                {groups.map(group => (
                  <CommandGroup key={group.heading} heading={group.heading}>
                    {group.models.map(item => (
                      <CommandItem
                        key={item.name}
                        value={item.name}
                        disabled={'unavailable' in item}
                        onSelect={() => {
                          setModel(item.name);
                          setOpen(false);
                        }}
                      >
                        <Check
                          aria-hidden="true"
                          strokeWidth={2.25}
                          className={cn(
                            'text-mind-a',
                            model === item.name ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        {item.name}
                        <CommandShortcut className="tabular-nums">
                          {'note' in item ? <Badge variant="outline">{item.note}</Badge> : null}
                          {'unavailable' in item ? 'Unavailable' : item.elo}
                        </CommandShortcut>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <p className="text-caption text-muted">
          Picked: <span className="text-fg-soft">{model}</span>. Open it and type to filter.
        </p>
      </div>
    </KitCard>
  );
}
