import { infoMeta, termsContent, TermsPage } from '@/features/info';

import type { Route } from './+types/terms';

export const meta: Route.MetaFunction = () => infoMeta(termsContent);

export default function TermsPageRoute() {
  return <TermsPage />;
}
