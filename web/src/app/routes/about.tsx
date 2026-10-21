import { aboutContent, AboutPage, infoMeta } from '@/features/info';

import type { Route } from './+types/about';

export const meta: Route.MetaFunction = () => infoMeta(aboutContent);

export default function AboutPageRoute() {
  return <AboutPage />;
}
