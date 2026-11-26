import { pricingContent } from '../content';
import { InfoPage } from './info-page';

/** /pricing/: free during the beta, what is included and the limits that apply today. */
export function PricingPage() {
  return <InfoPage page={pricingContent} />;
}
