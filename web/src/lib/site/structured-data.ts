import { absoluteUrl, type JsonLd, SITE_NAME } from './page-meta';

/**
 * The schema.org `WebApplication` of the Arena, with a free offer (the pricing page's promise:
 * free during the beta). One definition for the home page's graph and the pricing page, so the
 * two never disagree. No ratings or review counts: nothing here is typed in by hand but facts.
 */
export function webApplicationJsonLd(): Exclude<JsonLd, unknown[]> {
  return {
    '@type': 'WebApplication',
    '@id': `${absoluteUrl('/')}#webapp`,
    name: SITE_NAME,
    url: absoluteUrl('/'),
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any (web browser)',
    inLanguage: 'en',
    isAccessibleForFree: true,
    description:
      'Compare AI models blind: one prompt, two anonymous answers, and your vote feeds a public Elo leaderboard.',
    publisher: { '@id': `${absoluteUrl('/')}#organization` },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      url: absoluteUrl('/pricing/'),
      description: 'Free during the beta. No credit card.',
      availability: 'https://schema.org/InStock',
    },
  };
}
