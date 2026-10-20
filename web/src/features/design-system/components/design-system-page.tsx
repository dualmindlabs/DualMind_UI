import { SkipLink } from '@/components/layout/skip-link';

import { ColorSection } from './color-section';
import { ControlsSection } from './controls-section';
import { DesignFooter } from './design-footer';
import { DesignHeader } from './design-header';
import { EffectsSection } from './effects-section';
import { Hero } from './hero';
import { MotionSection } from './motion-section';
import { RolesSection } from './roles-section';
import { SpaceSection } from './space-section';
import { TypeSection } from './type-section';

/** The /design/ page: the living style guide, rendered from the production tokens. */
export function DesignSystemPage() {
  return (
    <>
      <SkipLink />
      <DesignHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <ColorSection />
        <RolesSection />
        <TypeSection />
        <ControlsSection />
        <SpaceSection />
        <MotionSection />
        <EffectsSection />
      </main>
      <DesignFooter />
    </>
  );
}
