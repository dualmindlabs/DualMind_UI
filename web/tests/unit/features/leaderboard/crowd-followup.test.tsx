import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CrowdNote } from '@/features/leaderboard/components/crowd-note';
import { Methodology } from '@/features/leaderboard/components/methodology';
import { ModelDetailsBody } from '@/features/leaderboard/components/model-details-body';
import { RangeBar } from '@/features/leaderboard/components/range-bar';
import { byRank, summarize, toLeaderboard } from '@/features/leaderboard/lib/entries';
import { crowdBoardSchema } from '@/lib/api/schemas/crowd';

import board from '../../../fixtures/api/crowd-board.json';
import { entry } from './helpers';

const data = crowdBoardSchema.parse(board);
const crowdBoard = toLeaderboard(data.items, data);

describe('ranks on the crowd board', () => {
  it('keeps a null rank null instead of inventing a number', () => {
    const unranked = crowdBoard.entries.filter(row => !row.provisional && row.rank === null);
    expect(unranked.length).toBeGreaterThan(0);
    // The API's ranks come through unchanged, including the shared ones.
    for (const row of crowdBoard.rated) {
      const source = data.items.find(item => item.modelId === row.id);
      expect(row.rank).toBe(source?.crowd?.rank);
    }
  });

  it('orders ranked rows, then rated rows without a rank by rating, then seeded rows', () => {
    const rows = [
      entry({ id: 'seed', name: 'Seed', rank: null, provisional: true, elo: 1300 }),
      entry({ id: 'none-low', name: 'NoneLow', rank: null, provisional: false, elo: 1010 }),
      entry({ id: 'second', name: 'Second', rank: 2, provisional: false, elo: 1100 }),
      entry({ id: 'none-high', name: 'NoneHigh', rank: null, provisional: false, elo: 1040 }),
      entry({ id: 'first', name: 'First', rank: 1, provisional: false, elo: 1200 }),
    ];
    expect([...rows].sort(byRank).map(row => row.id)).toEqual([
      'first',
      'second',
      'none-high',
      'none-low',
      'seed',
    ]);
  });

  it('measures the rating range over rated rows only, not the seeded starting values', () => {
    const summary = summarize([
      entry({ rank: 1, provisional: false, elo: 1100 }),
      entry({ rank: null, provisional: false, elo: 1020 }),
      entry({ rank: null, provisional: true, elo: 1500 }),
      entry({ rank: null, provisional: true, elo: 700 }),
    ]);
    expect(summary).toMatchObject({ topElo: 1100, bottomElo: 1020, rated: 2, ranked: 1 });
  });
});

describe('range bar whiskers', () => {
  const domain = { min: 1000, max: 1100 };
  it('marks the end a wide interval runs off', () => {
    const { container } = render(
      <RangeBar elo={1050} low={900} high={1200} domain={domain} measured />,
    );
    expect(container.querySelector('[data-clipped="low"]')).not.toBeNull();
    expect(container.querySelector('[data-clipped="high"]')).not.toBeNull();
  });

  it('shows no marker when the interval fits', () => {
    const { container } = render(
      <RangeBar elo={1050} low={1020} high={1080} domain={domain} measured />,
    );
    expect(container.querySelector('[data-clipped]')).toBeNull();
  });
});

describe('CrowdNote', () => {
  const crowd = { methodology: 'bt-v1', voteCount: 12, degraded: false, warnings: [] as string[] };

  it('renders the backend warnings quietly', () => {
    render(<CrowdNote crowd={{ ...crowd, warnings: ['Board truncated to 100 rows'] }} />);
    expect(
      within(screen.getByTestId('crowd-warnings')).getByText('Board truncated to 100 rows'),
    ).toBeVisible();
  });

  it('caps and shortens warnings, and renders them as text', () => {
    const long = `<b>x</b>${'a'.repeat(400)}`;
    render(<CrowdNote crowd={{ ...crowd, warnings: [long, '2', '3', '4', '5'] }} />);
    const box = screen.getByTestId('crowd-warnings');
    expect(box.querySelectorAll('p')).toHaveLength(3);
    expect(box.querySelector('b')).toBeNull();
    expect(box.textContent?.length ?? 0).toBeLessThan(300);
  });

  it('shows nothing when there are no warnings', () => {
    render(<CrowdNote crowd={crowd} />);
    expect(screen.queryByTestId('crowd-warnings')).toBeNull();
  });

  it('does not claim 0 votes when the count is unknown', () => {
    render(<CrowdNote crowd={{ ...crowd, voteCount: null }} />);
    expect(screen.getByTestId('crowd-note')).toHaveTextContent('Rated from blind votes');
    expect(screen.getByTestId('crowd-note')).not.toHaveTextContent(/\b0\b/);
  });
});

describe('details sheet', () => {
  it('tags a seeded Elo and shows no interval for it', () => {
    const seeded = crowdBoard.unrated[0];
    if (!seeded) throw new Error('fixture has no seeded row');
    render(<ModelDetailsBody entry={seeded} board={crowdBoard} />);
    expect(screen.getByText('Elo, seeded')).toBeVisible();
    expect(screen.queryByText(/±/)).toBeNull();
    expect(screen.getByText('Starting value, not a fitted rating')).toBeVisible();
    // Copy for the crowd board talks about votes, not a 5-battle rule.
    expect(screen.queryByText(/once it has \d+ battles/)).toBeNull();
    expect(screen.getByText(/Too few votes for a fitted rating/)).toBeVisible();
  });

  it('writes the interval as low to high, never as plus-minus', () => {
    const top = crowdBoard.rated[0];
    if (!top) throw new Error('fixture has no ranked row');
    render(<ModelDetailsBody entry={top} board={crowdBoard} />);
    expect(screen.queryByText(/±/)).toBeNull();
    expect(screen.getByText('1133–1167')).toBeInTheDocument();
  });

  it('explains a rated model without a rank claim', () => {
    const none = crowdBoard.entries.find(row => !row.provisional && row.rank === null);
    if (!none) throw new Error('fixture has no unranked row');
    render(<ModelDetailsBody entry={none} board={crowdBoard} />);
    expect(screen.getByText('No rank yet')).toBeVisible();
    expect(screen.getByText('Too few votes or a wide interval')).toBeVisible();
  });
});

describe('static methodology copy', () => {
  it('describes not yet rated by votes on the crowd board, by battles otherwise', () => {
    const { unmount } = render(<Methodology crowd />);
    expect(screen.getByText(/Too few votes for a fitted rating/)).toBeVisible();
    expect(screen.queryByText(/Fewer than \d+ battles/)).toBeNull();
    unmount();
    render(<Methodology />);
    expect(screen.getByText(/Fewer than \d+ battles/)).toBeVisible();
  });
});
