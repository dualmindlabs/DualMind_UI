import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RoleBadge } from '@/components/ui/role-badge';

describe('RoleBadge', () => {
  it('shows Mind A and Mind B with their letters, not colour alone', () => {
    const { container } = render(
      <>
        <RoleBadge role="a" />
        <RoleBadge role="b" />
      </>,
    );
    const [a, b] = container.querySelectorAll('[data-slot="role-badge"]');
    expect(a).toHaveTextContent('AMind A');
    expect(b).toHaveTextContent('BMind B');
    expect(a).toHaveAttribute('data-role', 'a');
    expect(b).toHaveAttribute('data-role', 'b');
  });

  it('calls the human "You"', () => {
    render(<RoleBadge role="human" />);
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('keeps the role for screen readers when a model name replaces it', () => {
    const { container } = render(<RoleBadge role="b" label="Model Borealis" />);
    const badge = container.querySelector('[data-slot="role-badge"]');
    expect(badge).toHaveTextContent('Model Borealis (Mind B)');
    expect(screen.getByText('(Mind B)', { exact: false })).toHaveClass('sr-only');
  });

  it('letter-only badges show the letter and still say the role', () => {
    const { container } = render(<RoleBadge role="a" letterOnly />);
    const badge = container.querySelector('[data-slot="role-badge"]');
    expect(badge).toHaveTextContent('AMind A');
    expect(screen.getByText('A')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Mind A')).toHaveClass('sr-only');
  });

  it('a letter-only human badge reads "You"', () => {
    render(<RoleBadge role="human" letterOnly />);
    expect(screen.getByText('You')).not.toHaveAttribute('aria-hidden');
  });
});
