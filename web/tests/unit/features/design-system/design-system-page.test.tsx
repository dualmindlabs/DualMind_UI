import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DesignSystemPage } from '@/features/design-system';
import { designSections } from '@/features/design-system/lib/sections';

describe('DesignSystemPage', () => {
  it('has landmarks, a skip link and one h1', () => {
    render(<DesignSystemPage />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Two minds, one verdict.');
  });

  it('never skips a heading level', () => {
    render(<DesignSystemPage />);
    const levels = screen.getAllByRole('heading').map(heading => Number(heading.tagName.slice(1)));
    levels.forEach((level, index) => {
      if (index > 0) expect(level - (levels[index - 1] ?? 1)).toBeLessThanOrEqual(1);
    });
  });

  it('links every section from the in-page navigation', () => {
    const { container } = render(<DesignSystemPage />);
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
    render(<DesignSystemPage />);
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
    render(<DesignSystemPage />);
    const email = screen.getByLabelText('Email');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription(/Enter a full email address/);
  });
});
