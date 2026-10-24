import { Keyboard } from 'lucide-react';
import { useRef } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Switch } from '@/components/ui/switch';
import { type ModifierKey, useModifierKey } from '@/hooks/use-modifier-key';
import { cn } from '@/lib/utils/cn';

import { useArena } from '../hooks/use-arena';
import { SHORTCUT_GROUPS, type ShortcutEntry } from '../lib/shortcuts';

/** One key as shown: `Mod` becomes Ctrl, or the Command sign (spelled out for screen readers). */
function KeyCap({ name, modifier }: { name: string; modifier: ModifierKey }) {
  if (name === 'Mod' && modifier === 'Cmd') {
    return (
      <Kbd>
        <span aria-hidden="true">⌘</span>
        <span className="sr-only">Command</span>
      </Kbd>
    );
  }
  return <Kbd>{name === 'Mod' ? 'Ctrl' : name}</Kbd>;
}

function ShortcutRow({
  entry,
  modifier,
  off,
}: {
  entry: ShortcutEntry;
  modifier: ModifierKey;
  off: boolean;
}) {
  return (
    <div
      data-testid="shortcut-row"
      data-off={off ? '' : undefined}
      className={cn(
        'flex min-h-10 items-center justify-between gap-4 border-b border-line py-1.5 pl-3 last:border-b-0',
        // The two vote keys carry their mind's colour on the left edge (and the letter in words).
        entry.description === 'A is better' && 'border-l-2 border-l-mind-a',
        entry.description === 'B is better' && 'border-l-2 border-l-mind-b',
        off && 'opacity-60',
      )}
    >
      <dt className="text-ui-sm text-fg-soft">
        {entry.description}
        {off ? <span className="sr-only"> (turned off)</span> : null}
      </dt>
      <dd className="shrink-0">
        <KbdGroup>
          {entry.keys.map(key => (
            <KeyCap key={key} name={key} modifier={modifier} />
          ))}
        </KbdGroup>
      </dd>
    </div>
  );
}

/**
 * Every arena shortcut in one dialog (design-direction.md section 7): `?` opens it outside text
 * fields, and so do the account menu and the command palette, so it is there when single keys
 * are off. The switch at the end turns the single-key shortcuts on and off (WCAG 2.1.4); while
 * they are off, those rows stay listed, dimmed and marked. Esc closes it and focus goes back to
 * what had it before.
 */
export function ShortcutsDialog() {
  const {
    shortcutsOpen,
    closeShortcuts,
    shortcutsReturnFocus,
    shortcutsEnabled,
    setShortcutsEnabled,
  } = useArena();
  const modifier = useModifierKey();
  // Focus starts on the title, so the dialog opens at its top on a phone (the first control is
  // the switch at the end) and screen readers start with the name.
  const title = useRef<HTMLHeadingElement>(null);

  return (
    <Dialog
      open={shortcutsOpen}
      onOpenChange={open => {
        if (!open) closeShortcuts();
      }}
    >
      <DialogContent
        data-testid="shortcuts-dialog"
        className="max-w-2xl gap-5"
        initialFocus={title}
        finalFocus={() => (shortcutsReturnFocus?.isConnected ? shortcutsReturnFocus : true)}
      >
        <DialogHeader className="grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1 text-left">
          <span
            aria-hidden="true"
            className="row-span-2 grid size-12 place-items-center rounded-lg border border-line-strong bg-surface-2 text-fg shadow-raise"
          >
            <Keyboard className="size-5" strokeWidth={1.5} />
          </span>
          <DialogTitle ref={title} tabIndex={-1} className="outline-none">
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription className="col-start-2">
            Battle, vote and move around without the mouse. Single keys work when you are not typing
            in a field.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {SHORTCUT_GROUPS.map(group => (
            <section
              key={group.heading}
              className={cn(
                'grid content-start gap-1',
                group.heading === 'Anywhere' && 'sm:row-span-2',
              )}
            >
              <h3 className="eyebrow text-fg-soft">{group.heading}</h3>
              <dl className="grid">
                {group.entries.map(entry => (
                  <ShortcutRow
                    key={entry.description}
                    entry={entry}
                    modifier={modifier}
                    off={entry.single === true && !shortcutsEnabled}
                  />
                ))}
              </dl>
            </section>
          ))}
        </div>
        <Field
          label="Single-key shortcuts"
          description="N, /, [, ? and the vote keys 1 to 4. Turn them off if they get in the way of a screen reader or voice control."
          layout="control-end"
          className="rounded-lg border border-line bg-surface p-3"
        >
          {control => (
            <Switch
              {...control}
              checked={shortcutsEnabled}
              onCheckedChange={checked => setShortcutsEnabled(checked)}
            />
          )}
        </Field>
      </DialogContent>
    </Dialog>
  );
}
