import { howItWorksContent, HowItWorksPage, infoMeta } from '@/features/info';

import type { Route } from './+types/how-it-works';

export const meta: Route.MetaFunction = () => infoMeta(howItWorksContent);

export default function HowItWorksPageRoute() {
  return <HowItWorksPage />;
}
