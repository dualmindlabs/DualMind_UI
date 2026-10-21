import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ShortcutsDialog } from '@/features/arena/components/shortcuts-dialog';
import { useArenaShortcuts } from '@/features/arena/hooks/use-arena-shortcuts';
import { SHORTCUT_GROUPS, singleKeyAction } from '@/features/arena/lib/shortcuts';

import { FakeArena } from './arena-context';

// The `?` overlay: every shortcut in lib/shortcuts.ts, opened by `?` outside text fields, closed
// by Esc with focus back where it was, and the single-key switch inside it.

function Keys() {
  useArenaShortcuts();
  return null;
}

function Screen() {
  return (
    <FakeArena>
      <Keys />
      <button type="button">Before</button>
      <textarea aria-label="Your prompt" />
      <ShortcutsDialog />
    </FakeArena>
  );
}

const ENTRIES = SHORTCUT_GROUPS.flatMap(group => group.entries);

describe('singleKeyAction', () => {
  const base = {
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    repeat: false,
    defaultPrevented: false,
    target: document.body,
  };

  it('opens the shortcuts on ? (Shift+/), but not with Ctrl, Cmd or Alt', () => {
    expect(singleKeyAction({ ...base, key: '?' })).toBe('show-shortcuts');
    expect(singleKeyAction({ ...base, key: '?', ctrlKey: true })).toBeNull();
    expect(singleKeyAction({ ...base, key: '?', metaKey: true })).toBeNull();
    expect(singleKeyAction({ ...base, key: '?', altKey: true })).toBeNull();
  });

  it('ignores ? while typing', () => {
    const field = document.createElement('input');
    expect(singleKeyAction({ ...base, key: '?', target: field })).toBeNull();
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    expect(singleKeyAction({ ...base, key: '?', target: editable })).toBeNull();
  });

  it('lists ? itself in the map', () => {
    expect(ENTRIES.some(entry => entry.keys.join('+') === '?')).toBe(true);
  });
});

describe('ShortcutsDialog', () => {
  it('? opens every shortcut; Esc closes it and focus goes back', async () => {
    const user = userEvent.setup();
    render(<Screen />);
    const before = screen.getByRole('button', { name: 'Before' });
    before.focus();

    await user.keyboard('?');
    const dialog = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' });
    expect(within(dialog).getAllByTestId('shortcut-row')).toHaveLength(ENTRIES.length);
    for (const entry of ENTRIES) expect(dialog).toHaveTextContent(entry.description);
    for (const group of SHORTCUT_GROUPS) {
      expect(within(dialog).getByRole('heading', { name: group.heading })).toBeInTheDocument();
    }
    // Keys in <kbd>, Mod spelled as Ctrl (or the Command sign on Apple devices).
    expect(dialog.querySelectorAll('kbd[data-slot="kbd"]').length).toBeGreaterThan(ENTRIES.length);
    expect(dialog).toHaveTextContent(/Ctrl|Command/);

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(before).toHaveFocus());
  });

  it('does not open while typing in the prompt box', async () => {
    const user = userEvent.setup();
    render(<Screen />);
    const prompt = screen.getByRole('textbox', { name: 'Your prompt' });
    await user.click(prompt);
    await user.keyboard('What is 2+2?');
    expect(prompt).toHaveValue('What is 2+2?');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('turns single keys off from the switch, and then ? does nothing', async () => {
    const user = userEvent.setup();
    render(<Screen />);
    await user.keyboard('?');
    const dialog = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' });
    expect(dialog).toHaveTextContent('Single-key shortcuts');
    const toggle = within(dialog).getByRole('switch');
    expect(toggle).toBeChecked();
    await user.click(toggle);
    expect(toggle).not.toBeChecked();
    const off = within(dialog)
      .getAllByTestId('shortcut-row')
      .filter(row => row.hasAttribute('data-off'));
    expect(off).toHaveLength(ENTRIES.filter(entry => entry.single).length);

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await user.keyboard('?');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
