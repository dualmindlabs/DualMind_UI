import { ModelsPage } from '@/features/models';
import { pageMeta } from '@/lib/site/page-meta';

import type { Route } from './+types/models';

export const meta: Route.MetaFunction = () =>
  pageMeta({
    title: 'AI models in the Arena · DualMind Arena',
    description:
      "Every AI model in DualMind Arena's blind battles, with its maker, live Elo rating, rank, win rate and battle count.",
    path: '/models/',
    image: {
      url: '/og/models.png',
      alt: 'DualMind Arena models. Every model in the Arena. Six model cards.',
      width: 1200,
      height: 630,
    },
  });

export default function ModelsRoute() {
  return <ModelsPage />;
}
