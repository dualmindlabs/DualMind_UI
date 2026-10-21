import {
  aboutContent,
  cookiesContent,
  faqContent,
  howItWorksContent,
  type PageContent,
  privacyContent,
  termsContent,
} from './content';

// Public API of the info feature: the typed page content, the page components (About, How it
// works, FAQ, Privacy, Terms, Cookies, 404) and the SEO helpers the route modules use.
export { AboutPage } from './components/about-page';
export { CookiesPage } from './components/cookies-page';
export { FaqPage } from './components/faq-page';
export { HowItWorksPage } from './components/how-it-works-page';
export { NotFoundPage } from './components/not-found-page';
export { PrivacyPage } from './components/privacy-page';
export { TermsPage } from './components/terms-page';
export * from './content';
export { infoMeta, notFoundMeta } from './lib/seo';

/** Every info and legal page, in navigation order. */
export const infoPages: readonly PageContent[] = [
  aboutContent,
  howItWorksContent,
  faqContent,
  privacyContent,
  termsContent,
  cookiesContent,
];
