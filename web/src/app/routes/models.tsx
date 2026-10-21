import { ModelsPage } from '@/features/models';
import { pageMeta } from '@/lib/site/page-meta';

import type { Route } from './+types/models';

export const meta: Route.MetaFunction = () =>
  pageMeta({
    title: 'AI models in the Arena · DualMind Arena',
    description:
      "Every AI model in DualMind Arena's blind battles, with its provider, live Elo rating, rank, win rate and battle count.",
    path: '/models/',
  });

export default function ModelsRoute() {
  return <ModelsPage />;
}
