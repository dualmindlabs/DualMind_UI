import { LeaderboardPage } from '@/features/leaderboard';
import { pageMeta } from '@/lib/site/page-meta';

import type { Route } from './+types/leaderboard';

export const meta: Route.MetaFunction = () =>
  pageMeta({
    title: 'AI model leaderboard: Elo from blind votes · DualMind Arena',
    description:
      'Live rankings of AI language models from blind, side-by-side battles: Elo ratings, win rates and battle counts, refreshed every minute.',
    path: '/leaderboard/',
    image: {
      url: '/og/leaderboard.png',
      alt: 'DualMind Arena leaderboard. Ranked by blind votes. Four ranked rows, the first highlighted.',
      width: 1200,
      height: 630,
    },
  });

export default function LeaderboardRoute() {
  return <LeaderboardPage />;
}
