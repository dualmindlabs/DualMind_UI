import { faqContent, FaqPage, infoMeta } from '@/features/info';

import type { Route } from './+types/faq';

export const meta: Route.MetaFunction = () => infoMeta(faqContent);

export default function FaqPageRoute() {
  return <FaqPage />;
}
