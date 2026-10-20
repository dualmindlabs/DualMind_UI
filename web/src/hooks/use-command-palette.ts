import type { LucideIcon } from 'lucide-react';
import { createContext, useContext, useEffect } from 'react';

/** One command in the palette. */
export interface CommandAction {
  id: string;
  label: string;
  /** Extra words the filter matches ("ranking" finds Leaderboard). */
  keywords?: readonly string[];
  icon?: LucideIcon;
  /** Shown on the right, for example a path or a shortcut. */
  hint?: string;
  perform: () => void;
}

/** A titled group of commands. Features register theirs with useCommandPaletteGroup(). */
export interface CommandGroupDefinition {
  id: string;
  heading: string;
  actions: readonly CommandAction[];
}

export interface CommandPaletteState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  /** Groups registered by features (the arena adds "New battle", "Switch mode"... in S8). */
  groups: readonly CommandGroupDefinition[];
  registerGroup: (group: CommandGroupDefinition) => () => void;
}

/** Provided by <CommandPaletteProvider> (components/layout/command-palette-provider.tsx). */
export const CommandPaletteContext = createContext<CommandPaletteState | null>(null);

/** The command palette's open state, and the groups features added to it. */
export function useCommandPalette(): CommandPaletteState {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette() needs <CommandPaletteProvider> (see src/app/root.tsx).');
  }
  return context;
}

/**
 * Adds a group of commands to the palette while the calling component is mounted. Pass a stable
 * group (useMemo), or it re-registers on every render.
 */
export function useCommandPaletteGroup(group: CommandGroupDefinition | null): void {
  const { registerGroup } = useCommandPalette();
  useEffect(() => (group ? registerGroup(group) : undefined), [group, registerGroup]);
}
