import type { CreditId } from '@/content/credits';

/** One vendored effect in the /design/ gallery. */
export interface EffectInfo {
  id: string;
  name: string;
  source: CreditId;
  /** The component's page at its source. */
  url: string;
  /** Where the redesign uses it (docs/redesign/component-catalog.md, section 3). */
  use: string;
  /** What visitors who ask for reduced motion get. */
  reduced: string;
  webgl?: boolean;
}

const rb = (name: string) => `https://reactbits.dev/${name}`;
const mu = (name: string) => `https://magicui.design/docs/components/${name}`;
const mp = (name: string) => `https://motion-primitives.com/docs/${name}`;
const ac = (name: string) => `https://ui.aceternity.com/components/${name}`;

export const effects = [
  {
    id: 'light-rays',
    name: 'Light Rays',
    source: 'reactbits',
    url: rb('backgrounds/light-rays'),
    use: 'Landing hero background',
    reduced: 'Static gradient poster',
    webgl: true,
  },
  {
    id: 'silk',
    name: 'Silk',
    source: 'reactbits',
    url: rb('backgrounds/silk'),
    use: 'Sign-in brand panel',
    reduced: 'Static gradient poster',
    webgl: true,
  },
  {
    id: 'blur-text',
    name: 'Blur Text',
    source: 'reactbits',
    url: rb('text-animations/blur-text'),
    use: 'Landing headline',
    reduced: 'Plain text, no entrance',
  },
  {
    id: 'decrypted-text',
    name: 'Decrypted Text',
    source: 'reactbits',
    url: rb('text-animations/decrypted-text'),
    use: 'Model names at the reveal',
    reduced: 'Names appear at once',
  },
  {
    id: 'shiny-text',
    name: 'Shiny Text',
    source: 'reactbits',
    url: rb('text-animations/shiny-text'),
    use: '"Generating" label',
    reduced: 'Plain text in the base colour',
  },
  {
    id: 'text-shimmer',
    name: 'Text Shimmer',
    source: 'motion-primitives',
    url: mp('text-shimmer'),
    use: 'Generating label (alternate)',
    reduced: 'Plain text in the base colour',
  },
  {
    id: 'text-type',
    name: 'Text Type',
    source: 'reactbits',
    url: rb('text-animations/text-type'),
    use: 'Example prompts in the composer',
    reduced: 'First sentence, no typing or caret blink',
  },
  {
    id: 'fuzzy-text',
    name: 'Fuzzy Text',
    source: 'reactbits',
    url: rb('text-animations/fuzzy-text'),
    use: '404 page',
    reduced: 'Plain text',
  },
  {
    id: 'count-up',
    name: 'Count Up',
    source: 'reactbits',
    url: rb('text-animations/count-up'),
    use: 'Leaderboard count-in, live strip',
    reduced: 'Final value at once',
  },
  {
    id: 'number-ticker',
    name: 'Number Ticker',
    source: 'magicui',
    url: mu('number-ticker'),
    use: 'Live numbers that keep changing',
    reduced: 'Jumps to each value',
  },
  {
    id: 'sliding-number',
    name: 'Sliding Number',
    source: 'motion-primitives',
    url: mp('sliding-number'),
    use: 'Rank and Elo changes',
    reduced: 'Plain number',
  },
  {
    id: 'border-beam',
    name: 'Border Beam',
    source: 'magicui',
    url: mu('border-beam'),
    use: 'The pane that is generating',
    reduced: 'No beam; the border stays',
  },
  {
    id: 'border-trail',
    name: 'Border Trail',
    source: 'motion-primitives',
    url: mp('border-trail'),
    use: 'Generating state (alternate)',
    reduced: 'No trail; the border stays',
  },
  {
    id: 'shine-border',
    name: 'Shine Border',
    source: 'magicui',
    url: mu('shine-border'),
    use: 'Leaderboard #1 card',
    reduced: 'A still shine',
  },
  {
    id: 'electric-border',
    name: 'Electric Border',
    source: 'reactbits',
    url: rb('animations/electric-border'),
    use: 'The chosen pane at the reveal',
    reduced: 'Static terra outline',
    webgl: true,
  },
  {
    id: 'star-border',
    name: 'Star Border',
    source: 'reactbits',
    url: rb('animations/star-border'),
    use: 'Closing call to action',
    reduced: 'A parked star',
  },
  {
    id: 'magnet',
    name: 'Magnet',
    source: 'reactbits',
    url: rb('animations/magnet'),
    use: 'Closing call to action (desktop)',
    reduced: 'Stays in place',
  },
  {
    id: 'spotlight-card',
    name: 'Spotlight Card',
    source: 'reactbits',
    url: rb('components/spotlight-card'),
    use: 'Podium and model cards',
    reduced: 'The light jumps instead of gliding',
  },
  {
    id: 'glowing-effect',
    name: 'Glowing Effect',
    source: 'aceternity',
    url: ac('glowing-effect'),
    use: 'Landing feature cards',
    reduced: 'Off; a hairline border stays',
  },
  {
    id: 'bento-grid',
    name: 'Bento Grid',
    source: 'aceternity',
    url: ac('bento-grid'),
    use: 'Landing features',
    reduced: 'No hover nudge',
  },
  {
    id: 'animated-background',
    name: 'Animated Background',
    source: 'motion-primitives',
    url: mp('animated-background'),
    use: 'Mode switch and theme toggle',
    reduced: 'The highlight jumps',
  },
  {
    id: 'animated-beam',
    name: 'Animated Beam',
    source: 'magicui',
    url: mu('animated-beam'),
    use: '"How a battle works" diagram',
    reduced: 'Still lines in the role colours',
  },
  {
    id: 'blur-fade',
    name: 'Blur Fade',
    source: 'magicui',
    url: mu('blur-fade'),
    use: 'Share transcript, revealed cards',
    reduced: 'Opacity fade only',
  },
  {
    id: 'marquee',
    name: 'Marquee',
    source: 'magicui',
    url: mu('marquee'),
    use: 'Model strip (alternate)',
    reduced: 'Still row',
  },
  {
    id: 'logo-loop',
    name: 'Logo Loop',
    source: 'reactbits',
    url: rb('animations/logo-loop'),
    use: 'Model providers strip',
    reduced: 'Still row',
  },
  {
    id: 'timeline',
    name: 'Timeline',
    source: 'aceternity',
    url: ac('timeline'),
    use: 'About and how it works',
    reduced: 'Full line, no scroll link',
  },
  {
    id: 'placeholders-and-vanish-input',
    name: 'Placeholders And Vanish Input',
    source: 'aceternity',
    url: ac('placeholders-and-vanish-input'),
    use: 'Landing hero composer',
    reduced: 'First example only; text clears without vanishing',
  },
] as const satisfies readonly EffectInfo[];

export type EffectId = (typeof effects)[number]['id'];

export function getEffect(id: EffectId): EffectInfo {
  const effect: EffectInfo | undefined = effects.find(item => item.id === id);
  if (!effect) throw new Error(`Unknown effect "${id}"`);
  return effect;
}
