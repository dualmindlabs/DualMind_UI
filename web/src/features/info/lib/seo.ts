import type { MetaDescriptor } from 'react-router';

import { config } from '@/config/env';
import { type JsonLd, pageMeta, type PageMetaInput } from '@/lib/site/page-meta';

import type { PageContent } from '../content';
import { faqId } from './blocks';
import { headingText } from './format';

const SITE_NAME = 'DualMind Arena';

/** "About DualMind Arena" stays as it is; other titles get the site name after a dot. */
export function documentTitle(title: string): string {
  return title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}`;
}

/** The canonical URL of a page: origin + `/<slug>/` (with the trailing slash the Worker serves). */
export function canonicalUrl(slug: string): string {
  return `${config.siteUrl}/${slug}/`;
}

/** The JSON-LD of the FAQ page: every question with its answer as one FAQPage. */
export function faqJsonLd(page: PageContent): Record<string, unknown> {
  const questions = page.sections.flatMap(section =>
    section.blocks.flatMap(block =>
      block.type === 'faq'
        ? [
            {
              '@type': 'Question',
              '@id': `${canonicalUrl(page.slug)}#${faqId(block.question)}`,
              name: block.question,
              acceptedAnswer: { '@type': 'Answer', text: block.answer.join(' ') },
            },
          ]
        : [],
    ),
  );
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    name: headingText(page.heading),
    mainEntity: questions,
  };
}

/**
 * Title, description, canonical, Open Graph and Twitter tags for an info or legal page (the
 * shared pageMeta), indexing, the share image and, on the FAQ, its FAQPage JSON-LD.
 */
export function infoMeta(page: PageContent): MetaDescriptor[] {
  const input: PageMetaInput = {
    title: documentTitle(page.title),
    description: page.description,
    path: `/${page.slug}/`,
    robots: 'index, follow',
    image: {
      url: '/og-default.png',
      alt: 'DualMind Arena: two minds, one verdict.',
      width: 1200,
      height: 630,
    },
  };
  if (page.slug === 'faq') input.jsonLd = faqJsonLd(page) as JsonLd;
  return pageMeta(input);
}

/** The 404 page: titled, never indexed, no canonical. */
export function notFoundMeta(): MetaDescriptor[] {
  return [
    { title: documentTitle('Page not found') },
    {
      name: 'description',
      content: 'This page does not exist. Go back to the Arena or the leaderboard.',
    },
    { name: 'robots', content: 'noindex' },
  ];
}
