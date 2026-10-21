import type { MetaDescriptor } from 'react-router';

import { config } from '@/config/env';

export const SITE_NAME = 'DualMind Arena';

export interface PageMetaInput {
  /** The full document title, for example "Leaderboard · DualMind Arena". */
  title: string;
  /** One or two sentences for search results and link previews (about 150 characters). */
  description: string;
  /** The page's public path with its trailing slash, for example "/leaderboard/". */
  path: string;
  /** Open Graph type. */
  type?: 'website' | 'article';
}

/**
 * The tags a public page needs for search engines and link previews: title, description,
 * canonical URL (on the production origin from VITE_SITE_URL), Open Graph and Twitter card.
 * Route modules return it from their `meta` function.
 */
export function pageMeta({
  title,
  description,
  path,
  type = 'website',
}: PageMetaInput): MetaDescriptor[] {
  const url = `${config.siteUrl}${path}`;
  return [
    { title },
    { name: 'description', content: description },
    { tagName: 'link', rel: 'canonical', href: url },
    { property: 'og:type', content: type },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    { name: 'twitter:card', content: 'summary' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
  ];
}
