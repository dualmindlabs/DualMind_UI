import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RevealCoachMark } from '@/features/arena/components/reveal-coach-mark';
import { REVEAL_COACH_KEY } from '@/features/arena/lib/coach-mark';

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('RevealCoachMark', () => {
  it('explains the hidden names once, then stays away after "Got it"', async () => {
    const user = userEvent.setup();
    const first = render(<RevealCoachMark />);
    expect(screen.getByRole('note', { name: 'How a battle works' })).toHaveTextContent(
      'model names appear once your vote is in',
    );
    await user.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByTestId('reveal-coach-mark')).toBeNull();
    expect(window.localStorage.getItem(REVEAL_COACH_KEY)).toBe('1');
    first.unmount();

    render(<RevealCoachMark />);
    expect(screen.queryByTestId('reveal-coach-mark')).toBeNull();
  });

  it('survives blocked storage: shows, and still closes for the visit', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const user = userEvent.setup();
    render(<RevealCoachMark />);
    expect(screen.getByTestId('reveal-coach-mark')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByTestId('reveal-coach-mark')).toBeNull();
  });
});
