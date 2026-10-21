import { notFoundMeta, NotFoundPage } from '@/features/info';

import type { Route } from './+types/not-found';

export const meta: Route.MetaFunction = () => notFoundMeta();

export default function NotFoundRoute() {
  return <NotFoundPage />;
}
