import type { PageContent } from './types';

/** /credits/: the heading and intro; the list itself is rendered from src/content/credits.ts. */
export const creditsContent: PageContent = {
  slug: 'credits',
  title: 'Credits and licenses',
  description:
    'The open-source and free-to-use work DualMind Arena is built on, with what we use from each source and its license.',
  eyebrow: 'Credits',
  heading: { text: 'Built on the work of', human: 'others.' },
  intro:
    'DualMind Arena stands on open-source and free-to-use work. Every source is listed here with what we use from it and its license.',
  sections: [],
};
