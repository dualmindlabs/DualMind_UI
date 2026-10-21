import { creditsContent } from '../content';
import { CreditsGrid } from './credits-grid';
import { InfoPage } from './info-page';

/** /credits/: every third-party source with what we use from it and its license. */
export function CreditsPage() {
  return <InfoPage page={creditsContent} afterSections={<CreditsGrid />} />;
}
