import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { VoteBar } from '@/features/arena/components/vote-bar';

// The Stage vote: the tug-of-war pill (A, B) with Tie and Both are bad under it, the keys 1 to 4
// on the buttons, and the quiet key hint. With the single-key shortcuts off, no key is promised.

function verdict() {
  return within(screen.getByRole('group', { name: 'Your verdict' })).getAllByRole('button');
}

describe('VoteBar', () => {
  it('offers A, B, Tie and Both are bad in that order, on the keys 1 to 4', () => {
    render(<VoteBar onVote={vi.fn()} chosen={null} />);
    const buttons = verdict();
    expect(buttons.map(button => button.textContent)).toEqual([
      expect.stringContaining('A is better'),
      expect.stringContaining('B is better'),
      expect.stringContaining('Tie'),
      expect.stringContaining('Both are bad'),
    ]);
    expect(buttons.map(button => button.getAttribute('aria-keyshortcuts'))).toEqual([
      '1',
      '2',
      '3',
      '4',
    ]);
    const hint = screen.getByTestId('vote-keys');
    expect(hint).toHaveAttribute('aria-hidden', 'true');
    expect(hint.textContent).toMatch(/1\s*to\s*4\s*to vote/);
  });

  it('promises no keys when the shortcuts are off', () => {
    render(<VoteBar onVote={vi.fn()} chosen={null} keys={false} />);
    expect(screen.queryByTestId('vote-keys')).not.toBeInTheDocument();
    for (const button of verdict()) {
      expect(button).not.toHaveAttribute('aria-keyshortcuts');
      expect(button.querySelector('kbd')).toBeNull();
    }
  });

  it('votes once, then holds the other buttons inert', async () => {
    const onVote = vi.fn();
    const { rerender } = render(<VoteBar onVote={onVote} chosen={null} />);
    await userEvent.click(screen.getByRole('button', { name: /B is better/ }));
    expect(onVote).toHaveBeenCalledWith('right');
    rerender(<VoteBar onVote={onVote} chosen="right" />);
    expect(screen.getByRole('button', { name: /B is better/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(screen.getByRole('button', { name: /^Tie/ }));
    expect(onVote).toHaveBeenCalledTimes(1);
  });
});
