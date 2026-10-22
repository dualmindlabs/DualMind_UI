import { developersMeta, DevelopersPage } from '@/features/developers';

import type { Route } from './+types/developers';

export const meta: Route.MetaFunction = () => developersMeta();

export default function DevelopersRoute() {
  return <DevelopersPage />;
}
