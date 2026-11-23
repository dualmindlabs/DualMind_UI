import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  lacksRankClaim,
  RankRange,
  rankRangeLabel,
} from '@/features/leaderboard/components/rank-range';
import { ratingRange } from '@/features/leaderboard/lib/confidence';
import type { CrowdStat } from '@/lib/api';

import { entry } from './helpers';

const crowd = (overrides: Partial<CrowdStat> = {}): CrowdStat => ({
  rating: 1100,
  ciLow: 1060,
  ciHigh: 1150,
  rank: 3,
  rankLow: 2,
  rankHigh: 4,
  votes: 120,
  provisional: false,
  ratingSource: 'votes',
  ...overrides,
});

describe('rank ranges', () => {
  it('writes the allowed ranks as "2–4", and nothing when the rank is certain', () => {
    expect(rankRangeLabel(entry({ crowd: crowd() }))).toBe('2–4');
    expect(rankRangeLabel(entry({ crowd: crowd({ rankLow: 3, rankHigh: 3 }) }))).toBeNull();
    expect(rankRangeLabel(entry({ crowd: null }))).toBeNull();
  });

  it('renders the range with a spoken explanation', () => {
    render(<RankRange entry={entry({ crowd: crowd(), provisional: false })} />);
    expect(screen.getByText('2–4')).toBeInTheDocument();
    expect(screen.getByText(/could rank anywhere from 2 to 4/)).toBeInTheDocument();
  });

  it('says so when a rated model has too few votes for a rank claim', () => {
    const noClaim = entry({
      provisional: false,
      crowd: crowd({ rank: null, rankLow: null, rankHigh: null }),
    });
    expect(lacksRankClaim(noClaim)).toBe(true);
    render(<RankRange entry={noClaim} />);
    expect(screen.getByText('by rating')).toBeInTheDocument();
    expect(screen.getByText(/no rank claimed yet/)).toBeInTheDocument();
  });

  it('draws nothing on the classic board', () => {
    const { container } = render(<RankRange entry={entry({ crowd: null })} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('ratingRange on the crowd board', () => {
  it('uses the measured interval, even when it is lopsided', () => {
    const range = ratingRange(entry({ elo: 1100, crowd: crowd() }));
    expect(range).toMatchObject({ low: 1060, high: 1150, measured: true, noun: 'Measured' });
    expect(range.margin).toBe(45);
  });

  it('falls back to the estimate for a seeded row', () => {
    const range = ratingRange(
      entry({
        elo: 1000,
        wins: 3,
        losses: 1,
        crowd: crowd({ rating: null, ciLow: null, ciHigh: null, ratingSource: 'seeded' }),
      }),
    );
    expect(range.measured).toBe(false);
    expect(range.noun).toBe('Estimated');
  });
});
