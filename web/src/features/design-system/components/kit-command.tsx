import { Bot, BrainCircuit, Cpu, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';

import { KitCard } from './kit-card';

/** The command list inline: the base of the palette and of the arena's model picker. */
export function KitCommand() {
  return (
    <KitCard
      title="Command list"
      source="@/components/ui/command"
      description="A filterable list driven from one text field: arrow keys move, Enter picks. The command palette and the model picker are built on it."
    >
      <Command
        label="Pick a model"
        className="h-80 rounded-lg border border-line shadow-raise"
        loop
      >
        <CommandInput placeholder="Search models" />
        <CommandList>
          <CommandEmpty>No model matches.</CommandEmpty>
          <CommandGroup heading="Frontier">
            <CommandItem value="Atlas 2" keywords={['reasoning']}>
              <BrainCircuit aria-hidden="true" strokeWidth={1.75} />
              Atlas 2
              <CommandShortcut>
                <Badge variant="outline">Reasoning</Badge>
              </CommandShortcut>
            </CommandItem>
            <CommandItem value="Borealis">
              <Sparkles aria-hidden="true" strokeWidth={1.75} />
              Borealis
              <CommandShortcut className="tabular-nums">1,247</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Open weights">
            <CommandItem value="Cirrus Pro">
              <Cpu aria-hidden="true" strokeWidth={1.75} />
              Cirrus Pro
              <CommandShortcut className="tabular-nums">1,201</CommandShortcut>
            </CommandItem>
            <CommandItem value="Delta Mini">
              <Bot aria-hidden="true" strokeWidth={1.75} />
              Delta Mini
              <CommandShortcut className="tabular-nums">1,188</CommandShortcut>
            </CommandItem>
            <CommandItem value="Ember 4" disabled>
              <Bot aria-hidden="true" strokeWidth={1.75} />
              Ember 4
              <CommandShortcut>Unavailable</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </KitCard>
  );
}
