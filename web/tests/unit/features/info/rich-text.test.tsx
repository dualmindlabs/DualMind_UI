import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RichText } from '@/features/info/components/rich-text';

describe('RichText', () => {
  it('links emails and [label](href) tokens and keeps the text around them', () => {
    render(
      <p>
        <RichText text="Write to a@b.co or see [Credits](/credits/) and [GitHub](https://github.com/x/y), thanks." />
      </p>,
    );
    expect(screen.getByRole('link', { name: 'a@b.co' })).toHaveAttribute('href', 'mailto:a@b.co');
    const internal = screen.getByRole('link', { name: 'Credits' });
    expect(internal).toHaveAttribute('href', '/credits/');
    expect(internal).not.toHaveAttribute('rel');
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText(/thanks\./)).toBeInTheDocument();
  });
});
