import playfairItalicLatin from '@fontsource/playfair-display/files/playfair-display-latin-400-italic.woff2?url';

import { LandingPage, landingSeo } from '@/features/marketing';
import type { SessionHandoffHandle } from '@/lib/session/handoff';
import { absoluteUrl, pageMeta, SITE_NAME } from '@/lib/site/page-meta';

import type { Route } from './+types/home';

/** Signed-in visitors and Supabase auth returns go to the legacy arena (lib/session/handoff.ts). */
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

export default function HomeRoute() {
  return <LandingPage />;
}
