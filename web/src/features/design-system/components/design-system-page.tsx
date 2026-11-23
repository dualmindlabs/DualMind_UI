import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SkipLink } from '@/components/layout/skip-link';

import { ColorSection } from './color-section';
import { ComponentsSection } from './components-section';
import { ControlsSection } from './controls-section';
import { DepthSection } from './depth-section';
import { EffectsSection } from './effects-section';
import { Hero } from './hero';
import { MotionSection } from './motion-section';
import { RolesSection } from './roles-section';
import { ShellSection } from './shell-section';
import { SpaceSection } from './space-section';
import { TypeSection } from './type-section';

/** The /design/ page: the living style guide, rendered from the production tokens. */
export function DesignSystemPage() {
  return (
    <>
      <SkipLink />
      <SiteHeader overlay />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <ColorSection />
        <RolesSection />
        <TypeSection />
        <ControlsSection />
        <SpaceSection />
        <DepthSection />
        <MotionSection />
        <ComponentsSection />
        <ShellSection />
        <EffectsSection />
      </main>
      <SiteFooter />
    </>
  );
}
