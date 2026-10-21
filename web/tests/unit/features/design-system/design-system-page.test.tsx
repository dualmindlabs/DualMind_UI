import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { credits } from '@/content/credits';
import { DesignSystemPage } from '@/features/design-system';
import { effects } from '@/features/design-system/lib/effects';
import { designSections } from '@/features/design-system/lib/sections';

import { renderWithShell } from '../../render-with-shell';

const renderPage = () => renderWithShell(<DesignSystemPage />);

describe('DesignSystemPage', () => {
  it('has landmarks, a skip link and one h1', () => {
    renderPage();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Two minds, one verdict.');
  });

  it('never skips a heading level', () => {
    renderPage();
    const levels = screen.getAllByRole('heading').map(heading => Number(heading.tagName.slice(1)));
    levels.forEach((level, index) => {
      if (index > 0) expect(level - (levels[index - 1] ?? 1)).toBeLessThanOrEqual(1);
    });
  });

  it('links every section from the in-page navigation', () => {
    const { container } = renderPage();
    const nav = screen.getByRole('navigation', { name: 'On this page' });
    for (const section of designSections) {
      expect(within(nav).getByRole('link', { name: new RegExp(section.title) })).toHaveAttribute(
        'href',
        `#${section.id}`,
      );
      expect(container.querySelector(`section#${section.id}`)).not.toBeNull();
    }
  });

  it('labels both answer panes and the verdict buttons', () => {
    renderPage();
    expect(screen.getByRole('region', { name: 'Answer A' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Answer B' })).toBeInTheDocument();
    const verdict = screen.getByRole('group', { name: 'Your verdict' });
    const labels = ['A is better', 'Tie', 'Both are bad', 'B is better'];
    const buttons = within(verdict).getAllByRole('button');
    expect(buttons).toHaveLength(labels.length);
    buttons.forEach((button, index) => {
      expect(button).toHaveAccessibleName(labels[index]);
      expect(button).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('links the email error to its field', () => {
    renderPage();
    const email = screen.getByLabelText('Email');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription(/Enter a full email address/);
  });

  it('shows every vendored effect once, credited to its source', () => {
    const { container } = renderPage();
    const frames = [...container.querySelectorAll('figure[data-effect]')];
    expect(frames.map(frame => frame.getAttribute('data-effect')).sort()).toEqual(
      effects.map(effect => effect.id).sort(),
    );
    for (const effect of effects) {
      const credit = credits.find(item => item.id === effect.source);
      expect(credit?.uses, effect.name).toContain(effect.name);
      const frame = screen.getByRole('figure', { name: effect.name });
      expect(
        within(frame).getByRole('link', { name: new RegExp(credit?.name ?? '') }),
      ).toHaveAttribute('href', effect.url);
    }
  });

  it('previews the reduced-motion versions of the effects', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    const toggle = screen.getByRole('button', { name: 'Preview reduced motion' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(container.querySelector('[data-reduced-motion="true"]')).toBeNull();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('[data-reduced-motion="true"]')).not.toBeNull();
    for (const gate of container.querySelectorAll('[data-webgl]')) {
      expect(gate).toHaveAttribute('data-webgl', 'static');
    }
  });
});

describe('DesignSystemPage, UI kit and shell', () => {
  it('uses the site header and footer as its landmarks', () => {
    renderPage();
    const banner = screen.getByRole('banner');
    expect(within(banner).getByRole('link', { name: 'DualMind Arena, home' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(within(banner).getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: 'Privacy' })).toHaveAttribute(
      'href',
      '/privacy/',
    );
  });

  it('gives every navigation landmark its own name', () => {
    renderPage();
    const names = screen
      .getAllByRole('navigation')
      .map(nav => nav.getAttribute('aria-label') ?? '');
    expect(new Set(names).size).toBe(names.length);
  });

  it('labels the one-time code input as one field', () => {
    renderPage();
    expect(screen.getByRole('textbox', { name: 'Verification code' })).toHaveAttribute(
      'autocomplete',
      'one-time-code',
    );
  });
});
