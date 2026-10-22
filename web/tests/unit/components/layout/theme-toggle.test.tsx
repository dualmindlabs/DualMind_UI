import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ThemeToggle } from '@/components/layout/theme-toggle';
import { THEME_STORAGE_KEY } from '@/lib/theme/theme';

describe('ThemeToggle', () => {
  it('offers system, dark and light as one radio group, system by default', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('group', { name: 'Color theme' })).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios.map(radio => radio.getAttribute('value'))).toEqual(['system', 'dark', 'light']);
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
  });

  it('shows the stored choice', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    render(<ThemeToggle />);
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
  });

  it('stores and applies a new choice', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole('radio', { name: 'Light' }));
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    await user.click(screen.getByRole('radio', { name: 'System' }));
    expect(document.documentElement).not.toHaveAttribute('data-theme');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
  });

  it('keeps two toggles on the page in sync', async () => {
    const user = userEvent.setup();
    render(
      <>
        <ThemeToggle />
        <ThemeToggle />
      </>,
    );
    const [first, second] = screen.getAllByRole('group', { name: 'Color theme' });
    if (!first || !second) throw new Error('expected two toggles');

    await user.click(first.querySelector('input[value="dark"]') as HTMLInputElement);
    expect(second.querySelector('input[value="dark"]')).toBeChecked();
  });
});
