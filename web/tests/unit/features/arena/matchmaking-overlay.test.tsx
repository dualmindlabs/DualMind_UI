import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MatchmakingOverlay } from '@/features/arena/components/matchmaking-overlay';

// The matchmaking beat covers the stage only while the first prompt of a battle is submitting. It
// is decoration (hidden from assistive technology) and goes away at once where nothing can fade.

describe('MatchmakingOverlay', () => {
  it('shows "Finding two models" while active, hidden from screen readers', () => {
    render(<MatchmakingOverlay active mode="battle" />);
    const overlay = screen.getByTestId('matchmaking');
    expect(overlay).toHaveAttribute('aria-hidden', 'true');
    expect(overlay).toHaveTextContent('Finding two models');
    expect(overlay).toHaveTextContent('Drawing two names from the pool');
  });

  it('says what happens in Side by side', () => {
    render(<MatchmakingOverlay active mode="side" />);
    expect(screen.getByTestId('matchmaking')).toHaveTextContent(
      'Calling the two models you picked',
    );
  });

  it('is not there when inactive, and leaves when the turn moves on', () => {
    const { rerender } = render(<MatchmakingOverlay active={false} mode="battle" />);
    expect(screen.queryByTestId('matchmaking')).toBeNull();
    rerender(<MatchmakingOverlay active mode="battle" />);
    expect(screen.getByTestId('matchmaking')).toBeInTheDocument();
    rerender(<MatchmakingOverlay active={false} mode="battle" />);
    expect(screen.queryByTestId('matchmaking')).toBeNull();
  });
});
