import {
  aboutContent,
  cookiesContent,
  faqContent,
  howItWorksContent,
  type PageContent,
  privacyContent,
  termsContent,
} from './content';

export * from './content';

/** Every info and legal page, in navigation order. */
export const infoPages: readonly PageContent[] = [
  aboutContent,
  howItWorksContent,
  faqContent,
  privacyContent,
  termsContent,
  cookiesContent,
];
