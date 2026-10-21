import { infoMeta, privacyContent, PrivacyPage } from '@/features/info';

import type { Route } from './+types/privacy';

export const meta: Route.MetaFunction = () => infoMeta(privacyContent);

export default function PrivacyPageRoute() {
  return <PrivacyPage />;
}
