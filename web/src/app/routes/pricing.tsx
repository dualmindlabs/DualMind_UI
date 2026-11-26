import { infoMeta, pricingContent, PricingPage } from '@/features/info';

import type { Route } from './+types/pricing';

export const meta: Route.MetaFunction = () => infoMeta(pricingContent);

export default function PricingPageRoute() {
  return <PricingPage />;
}
