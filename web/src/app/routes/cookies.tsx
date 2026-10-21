import { cookiesContent, CookiesPage, infoMeta } from '@/features/info';

import type { Route } from './+types/cookies';

export const meta: Route.MetaFunction = () => infoMeta(cookiesContent);

export default function CookiesPageRoute() {
  return <CookiesPage />;
}
