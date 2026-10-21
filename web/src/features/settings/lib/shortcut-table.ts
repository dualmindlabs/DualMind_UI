import type { SendKey, ShortcutEntry, ShortcutGroup } from '@/features/arena';

/**
 * The arena's keyboard map as the settings page lists it: the prompt box rows follow the send-key
 * setting (with "Ctrl/Cmd+Enter sends", Enter adds a line), everything else as the arena defines
 * it (features/arena/lib/shortcuts.ts).
 */
export function shortcutGroupsFor(
  groups: readonly ShortcutGroup[],
  sendKey: SendKey,
): ShortcutGroup[] {
  if (sendKey === 'enter') return [...groups];
  return groups.map(group => {
    const sendsWithEnter = group.entries.some(
      entry => entry.keys.length === 1 && entry.keys[0] === 'Enter',
    );
    if (!sendsWithEnter) return group;
    const entries: ShortcutEntry[] = group.entries.flatMap((entry): ShortcutEntry[] => {
      const keys = entry.keys.join('+');
      if (keys === 'Enter') return [];
      if (keys === 'Mod+Enter') return [{ ...entry, description: 'Send the prompt' }];
      if (keys === 'Shift+Enter') {
        return [{ keys: ['Enter'], description: 'New line' }, { ...entry, description: 'New line' }];
      }
      return [entry];
    });
    return { ...group, entries };
  });
}

/** `Mod` shown as the platform's modifier (Ctrl, or Cmd on Apple devices). */
export function displayKeys(keys: readonly string[], modifier: string): string[] {
  return keys.map(key => (key === 'Mod' ? modifier : key));
}
