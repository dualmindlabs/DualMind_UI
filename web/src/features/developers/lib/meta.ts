import type { MetaDescriptor } from 'react-router';

import { BRAND_PRIMARY } from '@/content/brand';
import { pageMeta } from '@/lib/site/page-meta';

import { DEVELOPERS_PATH, developersPage } from './content';

/** Title, description, canonical, Open Graph and Twitter tags of /developers/. */
export function developersMeta(): MetaDescriptor[] {
  return pageMeta({
    title: developersPage.title,
    description: developersPage.description,
    path: DEVELOPERS_PATH,
    robots: 'index, follow',
    image: {
      url: '/og-default.png',
      alt: `DualMind Arena: ${BRAND_PRIMARY}`,
      width: 1200,
      height: 630,
    },
  });
}
