import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { isPaletteShortcut } from '@/components/layout/command-palette-provider';
import { CommandPaletteTrigger } from '@/components/layout/command-palette-trigger';

import { renderWithShell } from '../../render-with-shell';

function key(init: KeyboardEventInit) {
  return new KeyboardEvent('keydown', init);
}

describe('isPaletteShortcut', () => {
  it('accepts Ctrl+K and Cmd+K only', () => {
    expect(isPaletteShortcut(key({ key: 'k', ctrlKey: true }))).toBe(true);
    expect(isPaletteShortcut(key({ key: 'K', metaKey: true }))).toBe(true);
    expect(isPaletteShortcut(key({ key: 'k' }))).toBe(false);
    expect(isPaletteShortcut(key({ key: 'k', ctrlKey: true, shiftKey: true }))).toBe(false);
    expect(isPaletteShortcut(key({ key: 'j', ctrlKey: true }))).toBe(false);
  });
});

describe('CommandPalette', () => {
  it('opens with Ctrl+K as a named dialog that lists pages and themes', async () => {
    renderWithShell(<p>Page</p>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    });

    const dialog = await screen.findByRole('dialog', { name: 'Command palette' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    for (const page of ['Arena', 'Leaderboard', 'Models', 'How it works', 'FAQ']) {
      expect(screen.getByRole('option', { name: new RegExp(page) })).toBeInTheDocument();
    }
    expect(screen.getByRole('option', { name: /Use the light theme/ })).toBeInTheDocument();
  });

  it('opens from the header trigger, which names the shortcut', async () => {
    renderWithShell(<CommandPaletteTrigger />);
    const trigger = screen.getByRole('button', { name: /^Search/ });
    expect(trigger).toHaveAttribute('aria-keyshortcuts', 'Control+K Meta+K');
    fireEvent.click(trigger);
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
    });
  });
});
