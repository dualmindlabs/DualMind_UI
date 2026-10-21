/**
 * The arena's keyboard map (design-direction.md section 7, new-features.md F-6). Shortcuts with
 * a modifier work everywhere; single-key shortcuts only fire when focus is not in a text field,
 * and can be turned off (`dm.arena.shortcuts` = `off`; WCAG 2.1.4, Character Key Shortcuts).
 * The `?` overlay and the vote keys 1 to 4 arrive with the battle flow (slice S9).
 */

export type SingleKeyAction = 'new-battle' | 'toggle-sidebar' | 'focus-composer';

export interface ShortcutEntry {
  /** Keys as shown, one <kbd> each. `Mod` becomes Ctrl or Cmd. */
  keys: readonly string[];
  description: string;
  /** A single character key: only outside text fields, and only while turned on. */
  single?: boolean;
}

export interface ShortcutGroup {
  heading: string;
  entries: readonly ShortcutEntry[];
}

export const SHORTCUT_GROUPS: readonly ShortcutGroup[] = [
  {
    heading: 'Anywhere',
    entries: [
      { keys: ['Mod', 'K'], description: 'Open the command palette' },
      { keys: ['N'], description: 'Start a new battle', single: true },
      { keys: ['/'], description: 'Move to the prompt box', single: true },
      { keys: ['['], description: 'Show or hide the history', single: true },
    ],
  },
  {
    heading: 'In the prompt box',
    entries: [
      { keys: ['Enter'], description: 'Send the prompt' },
      { keys: ['Mod', 'Enter'], description: 'Send the prompt (also on touch keyboards)' },
      { keys: ['Shift', 'Enter'], description: 'New line' },
      { keys: ['Esc'], description: 'Stop the answers, or leave the prompt box' },
    ],
  },
];

/** Where single-key shortcuts must not fire: anything that takes typed text. */
export function isTextEntryTarget(target: EventTarget | null): boolean {
  if (typeof Element === 'undefined' || !(target instanceof Element)) return false;
  if (target.closest('[contenteditable=""], [contenteditable="true"], [role="textbox"]')) {
    return true;
  }
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) {
    return !['button', 'checkbox', 'radio', 'range', 'reset', 'submit', 'color', 'file'].includes(
      target.type,
    );
  }
  return false;
}

/** The single-key action for a key press, or null (modifiers, repeats, text fields, other keys). */
export function singleKeyAction(
  event: Pick<
    KeyboardEvent,
    'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'repeat' | 'target' | 'defaultPrevented'
  >,
): SingleKeyAction | null {
  if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
    return null;
  }
  if (isTextEntryTarget(event.target)) return null;
  switch (event.key) {
    case 'n':
    case 'N':
      return 'new-battle';
    case '[':
      return 'toggle-sidebar';
    case '/':
      return 'focus-composer';
    default:
      return null;
  }
}
