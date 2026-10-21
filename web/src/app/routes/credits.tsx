import { creditsContent, CreditsPage, infoMeta } from '@/features/info';

import type { Route } from './+types/credits';

export const meta: Route.MetaFunction = () => infoMeta(creditsContent);

export default function CreditsPageRoute() {
  return <CreditsPage />;
}
