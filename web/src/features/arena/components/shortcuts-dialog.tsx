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
        'flex min-h-9 items-center justify-between gap-4 border-b border-line py-1.5 last:border-b-0',
        off && 'opacity-60',
      )}
    >
      <dt className="text-ui-sm text-fg-soft">
        {entry.description}
        {off ? <span className="sr-only"> (turned off)</span> : null}
      </dt>
      <dd className="shrink-0">
        <KbdGroup>
          {entry.keys.map(key => <KeyCap key={key} name={key} modifier={modifier} />)}
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

  return (
    <Dialog
      open={shortcutsOpen}
      onOpenChange={open => {
        if (!open) closeShortcuts();
      }}
    >
      <DialogContent
        data-testid="shortcuts-dialog"
        className="max-w-lg gap-4"
        finalFocus={() => (shortcutsReturnFocus?.isConnected ? shortcutsReturnFocus : true)}
      >
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Battle, vote and move around without the mouse. Single keys work when you are not
            typing in a field.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {SHORTCUT_GROUPS.map(group => (
            <section key={group.heading} className="grid gap-1">
              <h3 className="eyebrow text-muted">{group.heading}</h3>
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
