import { KitBadges } from './kit-badges';
import { KitButtons } from './kit-buttons';
import { KitChoices } from './kit-choices';
import { KitDisplay } from './kit-display';
import { KitFields } from './kit-fields';
import { KitOverlays } from './kit-overlays';
import { KitTabs } from './kit-tabs';
import { Section } from './section';

/** The UI kit: every primitive in components/ui, in its states. */
export function ComponentsSection() {
  return (
    <Section
      id="components"
      title={
        <>
          A kit you can <span className="human-voice text-human">lean on.</span>
        </>
      }
      lead={
        <p>
          The shadcn/ui primitives on Base UI, redrawn with our tokens. Every one has a visible
          focus ring, a target of at least 24 pixels (44 on touch screens), real labels and
          transitions that switch off under reduced motion.
        </p>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <KitButtons />
        <KitFields />
        <KitChoices />
        <KitTabs />
        <KitOverlays />
        <KitBadges />
        <KitDisplay />
      </div>
    </Section>
  );
}
