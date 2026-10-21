import { faqContent } from '../content';
import { InfoPage } from './info-page';

/** /faq/: questions as accordions with deep links (`/faq/#do-i-need-an-account`). */
export function FaqPage() {
  return <InfoPage page={faqContent} />;
}
