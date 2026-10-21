import { authSeo, ForgotPasswordPage } from '@/features/auth';
import { pageMeta } from '@/lib/site/page-meta';

import type { Route } from './+types/forgot-password';

export const meta: Route.MetaFunction = () =>
  pageMeta({
    title: authSeo.forgotPassword.title,
    description: authSeo.forgotPassword.description,
    path: '/forgot-password/',
    robots: 'noindex, follow',
  });

export default function ForgotPasswordRoute() {
  return <ForgotPasswordPage />;
}
