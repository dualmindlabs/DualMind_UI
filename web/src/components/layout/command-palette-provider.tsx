import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import {
  type CommandGroupDefinition,
  CommandPaletteContext,
  type CommandPaletteState,
} from '@/hooks/use-command-palette';

/** Ctrl+K (Cmd+K on Apple keyboards) toggles the palette from anywhere, text fields included. */
export function isPaletteShortcut(event: KeyboardEvent): boolean {
  return (
    (event.ctrlKey || event.metaKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === 'k'
  );
}

/**
 * Holds the command palette's open state and the command groups that features register, and
 * listens for the global shortcut. Mounted once in the root, around every page.
 */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<readonly CommandGroupDefinition[]>([]);

  const toggle = useCallback(() => setOpen(current => !current), []);

  const registerGroup = useCallback((group: CommandGroupDefinition) => {
    setGroups(current => [...current.filter(item => item.id !== group.id), group]);
    return () => setGroups(current => current.filter(item => item !== group));
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || !isPaletteShortcut(event)) return;
      event.preventDefault();
      setOpen(current => !current);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const value = useMemo<CommandPaletteState>(
    () => ({ open, setOpen, toggle, groups, registerGroup }),
    [open, toggle, groups, registerGroup],
  );

  return <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>;
}
