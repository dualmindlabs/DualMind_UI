import { config } from '@/config/env';
import { DesignSystemPage } from '@/features/design-system';

import type { Route } from './+types/design';

export const meta: Route.MetaFunction = () => [
  { title: 'Design system · DualMind Arena' },
  {
    name: 'description',
    content:
      'The living style guide of DualMind Arena: colour roles, type, controls, spacing and motion, rendered from the production tokens.',
  },
  { name: 'robots', content: 'noindex, nofollow' },
  { tagName: 'link', rel: 'canonical', href: `${config.siteUrl}/design/` },
];

export default function DesignRoute() {
  return <DesignSystemPage />;
}
