import { Suspense } from 'react';

import { ArenaBoot, LazyArenaApp, useHomeView } from '@/features/arena';
import { LandingPage, landingSeo } from '@/features/marketing';
import type { SessionHandoffHandle } from '@/lib/session/handoff';
import { ORG_GITHUB_URL, ORG_SITE_URL } from '@/lib/site/links';
import { absoluteUrl, pageMeta, SITE_NAME } from '@/lib/site/page-meta';
import { webApplicationJsonLd } from '@/lib/site/structured-data';

import type { Route } from './+types/home';

/**
 * The head script decides before the first paint (lib/session/handoff.ts): signed-in visitors and
 * Supabase auth returns stay here for the arena; password recovery links go on to the new
 * password page.
 */
export const handle: SessionHandoffHandle = { sessionHandoff: true };

export const meta: Route.MetaFunction = () =>
  pageMeta({
    title: landingSeo.title,
    description: landingSeo.description,
    path: '/',
    image: { url: landingSeo.ogImage, alt: landingSeo.ogImageAlt, width: 1200, height: 630 },
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${absoluteUrl('/')}#website`,
          url: absoluteUrl('/'),
          name: SITE_NAME,
          description: landingSeo.description,
          inLanguage: 'en',
          publisher: { '@id': `${absoluteUrl('/')}#organization` },
        },
        {
          '@type': 'Organization',
          '@id': `${absoluteUrl('/')}#organization`,
          name: 'DualMind Labs',
          url: ORG_SITE_URL,
          logo: absoluteUrl('/icon-512.png'),
          sameAs: [ORG_GITHUB_URL],
        },
        webApplicationJsonLd(),
      ],
    },
  });

/**
 * `/`: the landing page for signed-out visitors, the arena for signed-in ones (migration-plan.md
 * section 3.3). The arena's code is a lazy chunk; its loading frame covers the wait.
 */
export default function HomeRoute() {
  const view = useHomeView();
  if (view === 'arena') {
    return (
      <Suspense fallback={<ArenaBoot always />}>
        <LazyArenaApp />
      </Suspense>
    );
  }
  return (
    <>
      <ArenaBoot />
      <div data-landing="" className="contents">
        <LandingPage />
      </div>
    </>
  );
}
