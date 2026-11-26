import { dataContent, DataPage, infoMeta } from '@/features/info';

import type { Route } from './+types/data';

export const meta: Route.MetaFunction = () => infoMeta(dataContent);

export default function DataPageRoute() {
  return <DataPage />;
}
