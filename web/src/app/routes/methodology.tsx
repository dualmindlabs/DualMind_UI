import { MethodologyPage } from '@/features/leaderboard';
import { pageMeta } from '@/lib/site/page-meta';

import type { Route } from './+types/methodology';

export const meta: Route.MetaFunction = () =>
  pageMeta({
    title: 'Leaderboard methodology: ratings, intervals and ranks · DualMind Arena',
    description:
      'How the DualMind Arena leaderboard is computed from blind votes: the rating model, 95% intervals, rank ranges and vote receipts.',
    path: '/methodology/',
  });

export default function MethodologyRoute() {
  return <MethodologyPage />;
}
