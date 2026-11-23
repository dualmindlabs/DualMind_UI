import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { useCommandPalette } from '@/hooks/use-command-palette';
import { useModifierKey } from '@/hooks/use-modifier-key';
import { cn } from '@/lib/utils/cn';

export interface CommandPaletteTriggerProps {
  /**
   * `icon`: a square icon button (phones, compact bars). `pill`: a recessed search field with
   * the shortcut; the word "Search" shows from the `xl` breakpoint.
   */
  appearance?: 'icon' | 'pill';
  className?: string;
}

/** Opens the command palette, and shows its keyboard shortcut (Ctrl K, or Cmd K on Apple). */
export function CommandPaletteTrigger({
  appearance = 'pill',
  className,
}: CommandPaletteTriggerProps) {
  const { setOpen } = useCommandPalette();
  const modifier = useModifierKey();
  const shared = {
    'aria-haspopup': 'dialog',
    'aria-keyshortcuts': 'Control+K Meta+K',
    onClick: () => setOpen(true),
  } as const;

  if (appearance === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Search and commands"
        className={className}
        {...shared}
      >
        <Search aria-hidden="true" strokeWidth={1.75} />
      </Button>
    );
  }

  // The name comes from the content ("Search Ctrl K"), so it always contains the visible text;
  // "Search" is read out even where only the shortcut is shown. Recessed like a field, so the
  // header reads as controls on a surface.
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        'justify-start gap-2 rounded-full border-line bg-bg-deep pr-1.5 pl-3 text-muted shadow-[inset_0_1px_2px_color-mix(in_oklab,black_18%,transparent)] hover:border-line-strong hover:bg-bg-deep hover:text-fg xl:w-52',
        className,
      )}
      {...shared}
    >
      <Search aria-hidden="true" strokeWidth={1.75} />
      <span className="flex-1 text-left font-normal max-xl:sr-only">Search</span>
      <KbdGroup>
        <Kbd>{modifier === 'Cmd' ? '⌘' : 'Ctrl'}</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>
    </Button>
  );
}
