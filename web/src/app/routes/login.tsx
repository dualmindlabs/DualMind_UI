import { authSeo, LoginPage } from '@/features/auth';
import { pageMeta } from '@/lib/site/page-meta';

import type { Route } from './+types/login';

export const meta: Route.MetaFunction = () =>
  pageMeta({ title: authSeo.login.title, description: authSeo.login.description, path: '/login/' });

export default function LoginRoute() {
  return <LoginPage />;
}
