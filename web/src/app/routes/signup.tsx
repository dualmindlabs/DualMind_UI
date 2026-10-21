import { authSeo, SignupPage } from '@/features/auth';
import { pageMeta } from '@/lib/site/page-meta';

import type { Route } from './+types/signup';

export const meta: Route.MetaFunction = () =>
  pageMeta({
    title: authSeo.signup.title,
    description: authSeo.signup.description,
    path: '/signup/',
  });

export default function SignupRoute() {
  return <SignupPage />;
}
