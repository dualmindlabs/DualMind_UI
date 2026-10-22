import { DesignSystemPage } from '@/features/design-system';
import { pageMeta } from '@/lib/site/page-meta';

import type { Route } from './+types/design';

export const meta: Route.MetaFunction = () =>
  pageMeta({
    title: 'Design system · DualMind Arena',
    description:
      'The living style guide of DualMind Arena: color roles, type, controls, spacing and motion, rendered from the production tokens.',
    path: '/design/',
    robots: 'noindex, nofollow',
  });

export default function DesignRoute() {
  return <DesignSystemPage />;
}
