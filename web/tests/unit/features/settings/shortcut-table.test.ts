import { describe, expect, it } from 'vitest';

import { isSubmitKey } from '@/components/vendor/prompt-kit/prompt-input';
import { SHORTCUT_GROUPS } from '@/features/arena/lib/shortcuts';
import { displayKeys, shortcutGroupsFor } from '@/features/settings/lib/shortcut-table';

// Slice S12: the keyboard map on /settings/ follows the send-key setting, and so does the
// composer.

function promptBox(groups: ReturnType<typeof shortcutGroupsFor>) {
  const group = groups.find(item => item.heading === 'In the prompt box');
  return group?.entries.map(entry => `${entry.keys.join('+')}: ${entry.description}`);
}

describe('shortcutGroupsFor', () => {
  it('lists the arena map unchanged when Enter sends', () => {
    expect(shortcutGroupsFor(SHORTCUT_GROUPS, 'enter')).toEqual([...SHORTCUT_GROUPS]);
  });

  it('makes Enter a new line when only Ctrl/Cmd+Enter sends', () => {
    expect(promptBox(shortcutGroupsFor(SHORTCUT_GROUPS, 'mod-enter'))).toEqual([
      'Mod+Enter: Send the prompt',
      'Enter: New line',
      'Shift+Enter: New line',
      'Esc: Stop the answers, or leave the prompt box',
    ]);
    // The other groups are untouched.
    const voting = shortcutGroupsFor(SHORTCUT_GROUPS, 'mod-enter').find(
      group => group.heading === 'Voting',
    );
    expect(voting).toBe(SHORTCUT_GROUPS.find(group => group.heading === 'Voting'));
  });

  it('shows Mod as the platform key', () => {
    expect(displayKeys(['Mod', 'K'], 'Cmd')).toEqual(['Cmd', 'K']);
    expect(displayKeys(['Shift', 'Enter'], 'Ctrl')).toEqual(['Shift', 'Enter']);
  });
});

function key(init: { key: string; shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }) {
  return {
    key: init.key,
    shiftKey: init.shiftKey ?? false,
    ctrlKey: init.ctrlKey ?? false,
    metaKey: init.metaKey ?? false,
    nativeEvent: { isComposing: false } as KeyboardEvent,
  };
}

describe('isSubmitKey', () => {
  it('sends on Enter by default, never on Shift+Enter', () => {
    expect(isSubmitKey(key({ key: 'Enter' }))).toBe(true);
    expect(isSubmitKey(key({ key: 'Enter', ctrlKey: true }))).toBe(true);
    expect(isSubmitKey(key({ key: 'Enter', shiftKey: true }))).toBe(false);
    expect(isSubmitKey(key({ key: 'a' }))).toBe(false);
  });

  it('sends only on Ctrl or Cmd+Enter with the setting', () => {
    expect(isSubmitKey(key({ key: 'Enter' }), 'mod-enter')).toBe(false);
    expect(isSubmitKey(key({ key: 'Enter', shiftKey: true }), 'mod-enter')).toBe(false);
    expect(isSubmitKey(key({ key: 'Enter', ctrlKey: true }), 'mod-enter')).toBe(true);
    expect(isSubmitKey(key({ key: 'Enter', metaKey: true }), 'mod-enter')).toBe(true);
  });

  it('never sends while an input method is composing', () => {
    const composing = {
      ...key({ key: 'Enter' }),
      nativeEvent: { isComposing: true } as KeyboardEvent,
    };
    expect(isSubmitKey(composing)).toBe(false);
  });
});
