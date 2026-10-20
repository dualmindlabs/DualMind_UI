/**
 * "Built with": every third-party source the web app uses, with its licence. The About page
 * (slice S4) renders it, the /design/ effects gallery labels each effect with it, and it must
 * match the inventory in docs/redesign/licences.md (section 4).
 */

export type CreditId =
  | 'reactbits'
  | 'magicui'
  | 'motion-primitives'
  | 'aceternity'
  | 'motion'
  | 'lucide'
  | 'react-router'
  | 'tailwindcss'
  | 'fontsource';

export interface Credit {
  id: CreditId;
  name: string;
  url: string;
  /** Short licence name, as shown on badges. */
  licence: string;
  licenceUrl: string;
  /** `vendored`: source copied into src/components/vendor/<id>/. `dependency`: an npm package. */
  kind: 'vendored' | 'dependency';
  /** Licences with conditions beyond keeping the notice (Commons Clause, custom terms). */
  restricted: boolean;
  /** What we use from it. */
  uses: readonly string[];
}

export const credits: readonly Credit[] = [
  {
    id: 'reactbits',
    name: 'React Bits',
    url: 'https://reactbits.dev',
    licence: 'MIT + Commons Clause',
    licenceUrl: 'https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md',
    kind: 'vendored',
    restricted: true,
    uses: [
      'Light Rays',
      'Silk',
      'Blur Text',
      'Decrypted Text',
      'Count Up',
      'Shiny Text',
      'Text Type',
      'Spotlight Card',
      'Star Border',
      'Electric Border',
      'Magnet',
      'Logo Loop',
      'Fuzzy Text',
    ],
  },
  {
    id: 'magicui',
    name: 'Magic UI',
    url: 'https://magicui.design',
    licence: 'MIT',
    licenceUrl: 'https://github.com/magicuidesign/magicui/blob/main/LICENSE.md',
    kind: 'vendored',
    restricted: false,
    uses: ['Border Beam', 'Shine Border', 'Animated Beam', 'Blur Fade', 'Marquee', 'Number Ticker'],
  },
  {
    id: 'motion-primitives',
    name: 'Motion Primitives',
    url: 'https://motion-primitives.com',
    licence: 'MIT',
    licenceUrl: 'https://github.com/ibelick/motion-primitives/blob/main/LICENCE.md',
    kind: 'vendored',
    restricted: false,
    uses: ['Text Shimmer', 'Animated Background', 'Sliding Number', 'Border Trail'],
  },
  {
    id: 'aceternity',
    name: 'Aceternity UI',
    url: 'https://ui.aceternity.com',
    licence: 'Aceternity licence (free tier)',
    licenceUrl: 'https://ui.aceternity.com/licence',
    kind: 'vendored',
    restricted: true,
    uses: ['Placeholders And Vanish Input', 'Glowing Effect', 'Bento Grid', 'Timeline'],
  },
  {
    id: 'motion',
    name: 'Motion',
    url: 'https://motion.dev',
    licence: 'MIT',
    licenceUrl: 'https://github.com/motiondivision/motion/blob/main/LICENSE.md',
    kind: 'dependency',
    restricted: false,
    uses: ['Animation engine (LazyMotion, springs, scroll)'],
  },
  {
    id: 'lucide',
    name: 'Lucide',
    url: 'https://lucide.dev',
    licence: 'ISC',
    licenceUrl: 'https://github.com/lucide-icons/lucide/blob/main/LICENSE',
    kind: 'dependency',
    restricted: false,
    uses: ['Icons'],
  },
  {
    id: 'react-router',
    name: 'React Router',
    url: 'https://reactrouter.com',
    licence: 'MIT',
    licenceUrl: 'https://github.com/remix-run/react-router/blob/main/LICENSE.md',
    kind: 'dependency',
    restricted: false,
    uses: ['Routing and prerendering'],
  },
  {
    id: 'tailwindcss',
    name: 'Tailwind CSS',
    url: 'https://tailwindcss.com',
    licence: 'MIT',
    licenceUrl: 'https://github.com/tailwindlabs/tailwindcss/blob/main/LICENSE',
    kind: 'dependency',
    restricted: false,
    uses: ['Styling'],
  },
  {
    id: 'fontsource',
    name: 'Fontsource (Bricolage Grotesque, Playfair Display, DM Mono, JetBrains Mono)',
    url: 'https://fontsource.org',
    licence: 'SIL Open Font License 1.1',
    licenceUrl: 'https://openfontlicense.org',
    kind: 'dependency',
    restricted: false,
    uses: ['Self-hosted fonts'],
  },
];

export function getCredit(id: CreditId): Credit {
  const credit = credits.find(item => item.id === id);
  if (!credit) throw new Error(`Unknown credit "${id}"`);
  return credit;
}
