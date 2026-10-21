import playfairItalicLatin from '@fontsource/playfair-display/files/playfair-display-latin-400-italic.woff2?url';
import { Suspense } from 'react';

import { ArenaBoot, LazyArenaApp, useHomeView } from '@/features/arena';
import { LandingPage, landingSeo } from '@/features/marketing';
import type { SessionHandoffHandle } from '@/lib/session/handoff';
import { absoluteUrl, pageMeta, SITE_NAME } from '@/lib/site/page-meta';

import type { Route } from './+types/home';

/**
 * The head script decides before the first paint (lib/session/handoff.ts): signed-in visitors of
 * the new arena stay here, other signed-in visitors and Supabase auth returns go to the legacy
 * arena.
 */
export const handle: SessionHandoffHandle = { sessionHandoff: true };

export const links: Route.LinksFunction = () => [
  // The hero's human-voice phrase ("You decide.") is above the fold: no late swap, no shift.
  {
    rel: 'preload',
    href: playfairItalicLatin,
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
  },
];

export const meta: Route.MetaFunction = () => [
  ...pageMeta({
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
          url: 'https://dualmindlab.tech',
          logo: absoluteUrl('/icon-512.png'),
          sameAs: ['https://github.com/dualmindlabs'],
        },
      ],
    },
  }),
  { property: 'og:locale', content: 'en_US' },
];

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
