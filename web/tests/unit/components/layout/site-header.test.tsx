import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SiteHeader } from '@/components/layout/site-header';

import { renderWithShell } from '../../render-with-shell';

describe('SiteHeader', () => {
  it('is the banner with a home link, the main navigation and sign in', () => {
    renderWithShell(<SiteHeader />, '/leaderboard/');
    const banner = screen.getByRole('banner');
    expect(within(banner).getByRole('link', { name: 'DualMind Arena, home' })).toHaveAttribute(
      'href',
      '/',
    );
    const nav = within(banner).getByRole('navigation', { name: 'Main' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map(link => link.textContent),
    ).toEqual(['Arena', 'Leaderboard', 'Models', 'How it works']);
    expect(within(banner).getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login/',
    );
  });

  it('marks the current page', () => {
    renderWithShell(<SiteHeader />, '/leaderboard/');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Leaderboard' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Arena' })).not.toHaveAttribute('aria-current');
  });

  it('starts uncondensed (prerendered at the top of the page) and can be forced condensed', () => {
    const { container, unmount } = renderWithShell(<SiteHeader />);
    expect(container.querySelector('[data-slot="site-header"]')).not.toHaveAttribute(
      'data-condensed',
    );
    unmount();
    const condensed = renderWithShell(<SiteHeader condensed landmark={false} />);
    expect(condensed.container.querySelector('[data-slot="site-header"]')).toHaveAttribute(
      'data-condensed',
    );
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  it('has a compact app variant with a phone menu button', () => {
    renderWithShell(<SiteHeader variant="app" />, '/');
    const banner = screen.getByRole('banner');
    expect(banner).toHaveAttribute('data-variant', 'app');
    expect(within(banner).getByRole('button', { name: 'Open the menu' })).toBeInTheDocument();
    expect(within(banner).getByRole('link', { name: 'Arena' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
