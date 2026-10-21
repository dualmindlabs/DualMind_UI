import { aboutContent } from '../content';
import { CreditsGrid } from './credits-grid';
import { InfoPage } from './info-page';

/** /about/: the editorial page plus the "Built with" credits the licence policy requires. */
export function AboutPage() {
  return (
    <InfoPage
      page={aboutContent}
      afterSections={aboutContent.showCredits ? <CreditsGrid /> : null}
    />
  );
}
