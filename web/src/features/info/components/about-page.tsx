import { aboutContent } from '../content';
import { InfoPage } from './info-page';

/** /about/: the company page. The license and credits wall lives on /credits/. */
export function AboutPage() {
  return <InfoPage page={aboutContent} />;
}
