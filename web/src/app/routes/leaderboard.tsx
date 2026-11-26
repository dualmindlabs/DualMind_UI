import { LeaderboardPage } from '@/features/leaderboard';
import { pageMeta } from '@/lib/site/page-meta';

import type { Route } from './+types/leaderboard';

export const meta: Route.MetaFunction = () =>
  pageMeta({
    title: 'AI model leaderboard: Elo ratings, under audit · DualMind Arena',
    description:
      'Rankings of AI language models from blind, side-by-side battles: Elo ratings, win rates and battle counts. The ratings are under audit, and each model says whether you can meet it in a blind battle.',
    path: '/leaderboard/',
    image: {
      url: '/og/leaderboard-v2.png',
      alt: 'DualMind Arena leaderboard. Blind battles between AI models. Four ranked rows, the first highlighted.',
      width: 1200,
      height: 630,
    },
  });

export default function LeaderboardRoute() {
  return <LeaderboardPage />;
}
