/**
 * The colour and motion token values from tokens.css, as data: the /design/ page renders its
 * swatches and contrast table from this, and tests/unit/tokens.test.ts checks that every value
 * here matches tokens.css and meets its WCAG contrast target. Components never import hex values
 * from here; they use the Tailwind token utilities.
 */

export type ThemeName = 'dark' | 'light';

/**
 * What a colour is for, which sets the contrast it needs against the page background:
 * text 4.5:1 (WCAG 1.4.3), controls and fills 3:1 (WCAG 1.4.11), surfaces and decoration none.
 */
export type TokenKind = 'surface' | 'decorative' | 'control' | 'fill' | 'text';

export interface ColorToken {
  /** CSS variable name, as used in tokens.css. */
  name: `--${string}`;
  label: string;
  use: string;
  kind: TokenKind;
  group: 'Surfaces' | 'Lines' | 'Text' | 'Roles' | 'Status' | 'Focus and accents';
  dark: string;
  light: string;
  /** Measured against this token instead of the background (text placed on an accent). */
  against?: `--${string}`[];
}

export const backgrounds: Record<ThemeName, string> = { dark: '#08090B', light: '#F7F8FA' };

export const colorTokens: ColorToken[] = [
  {
    name: '--bg',
    label: 'Background',
    use: 'Page background: Midnight, or Paper',
    kind: 'surface',
    group: 'Surfaces',
    dark: '#08090B',
    light: '#F7F8FA',
  },
  {
    name: '--bg-deep',
    label: 'Deep background',
    use: 'Hero, footer and recessed sections',
    kind: 'surface',
    group: 'Surfaces',
    dark: '#050608',
    light: '#EEF0F3',
  },
  {
    name: '--surface',
    label: 'Surface',
    use: 'Cards, panes, sidebar',
    kind: 'surface',
    group: 'Surfaces',
    dark: '#0E1014',
    light: '#FFFFFF',
  },
  {
    name: '--surface-2',
    label: 'Raised surface',
    use: 'Menus, popovers, composer, docks',
    kind: 'surface',
    group: 'Surfaces',
    dark: '#14171C',
    light: '#FFFFFF',
  },
  {
    name: '--line-subtle',
    label: 'Hairline',
    use: 'Dividers, used as --line',
    kind: 'decorative',
    group: 'Lines',
    dark: '#1F232B',
    light: '#E3E6EB',
  },
  {
    name: '--line-strong',
    label: 'Control border',
    use: 'Inputs and control borders',
    kind: 'control',
    group: 'Lines',
    dark: '#5E6674',
    light: '#858C99',
  },
  {
    name: '--fg',
    label: 'Foreground',
    use: 'Body text: near-white on Midnight, ink on Paper',
    kind: 'text',
    group: 'Text',
    dark: '#ECEEF2',
    light: '#0E1014',
  },
  {
    name: '--fg-soft',
    label: 'Soft foreground',
    use: 'Secondary text',
    kind: 'text',
    group: 'Text',
    dark: '#B6BBC6',
    light: '#3A404B',
  },
  {
    name: '--muted',
    label: 'Muted',
    use: 'Captions and metadata',
    kind: 'text',
    group: 'Text',
    dark: '#8A91A0',
    light: '#5B6270',
  },
  {
    name: '--mind-a',
    label: 'Mind A',
    use: 'The first model: cyan accents, text, badges',
    kind: 'text',
    group: 'Roles',
    dark: '#4AABC2',
    light: '#17728A',
  },
  {
    name: '--mind-b',
    label: 'Mind B',
    use: 'The second model: terracotta fills and borders',
    kind: 'fill',
    group: 'Roles',
    dark: '#E0A07C',
    light: '#B25F37',
  },
  {
    name: '--mind-b-text',
    label: 'Mind B text',
    use: 'The second model: text',
    kind: 'text',
    group: 'Roles',
    dark: '#E8AF8E',
    light: '#9E4D25',
  },
  {
    name: '--human',
    label: 'Human',
    use: 'Your prompt, your vote, your winner: champagne gold',
    kind: 'text',
    group: 'Roles',
    dark: '#7BE0B0',
    light: '#16794F',
  },
  {
    name: '--ok',
    label: 'OK',
    use: 'Success and online states',
    kind: 'text',
    group: 'Status',
    dark: '#6FD9A0',
    light: '#1B7A4E',
  },
  {
    name: '--warn',
    label: 'Warning',
    use: 'Provisional and degraded states',
    kind: 'text',
    group: 'Status',
    dark: '#F0C060',
    light: '#855400',
  },
  {
    name: '--bad',
    label: 'Error',
    use: 'Errors and destructive actions',
    kind: 'text',
    group: 'Status',
    dark: '#EE8E8E',
    light: '#B3261E',
  },
  {
    name: '--focus',
    label: 'Focus ring',
    use: '2px ring, 3px offset',
    kind: 'control',
    group: 'Focus and accents',
    dark: '#6CC4DB',
    light: '#17728A',
  },
  {
    name: '--on-accent',
    label: 'On accent',
    use: 'Text on Mind A, Mind B, Human and error fills',
    kind: 'text',
    group: 'Focus and accents',
    dark: '#08090B',
    light: '#FFFFFF',
    against: ['--mind-a', '--mind-b', '--human', '--bad'],
  },
];

/** Minimum contrast against the background for each kind of token. */
export const contrastTarget: Record<TokenKind, number | null> = {
  surface: null,
  decorative: null,
  control: 3,
  fill: 3,
  text: 4.5,
};

export interface MotionToken {
  name: `--${string}`;
  ms: number;
  use: string;
}

export const durations: MotionToken[] = [
  { name: '--dur-instant', ms: 90, use: 'Press states, toggles' },
  { name: '--dur-fast', ms: 160, use: 'Hovers, menus, tooltips' },
  { name: '--dur-base', ms: 280, use: 'Panels, tabs, list changes' },
  { name: '--dur-slow', ms: 440, use: 'Page transitions, drawers, theme reveal' },
  { name: '--dur-cinematic', ms: 700, use: 'Hero entrance and the reveal only' },
];

export interface EasingToken {
  name: `--${string}`;
  points: [number, number, number, number];
  use: string;
}

export const easings: EasingToken[] = [
  { name: '--ease-out-expo', points: [0.16, 1, 0.3, 1], use: 'Default for entrances' },
  { name: '--ease-in-out', points: [0.65, 0, 0.35, 1], use: 'Moves, swaps and morphs' },
  { name: '--ease-snap', points: [0.2, 0.8, 0.2, 1], use: 'Hovers and presses' },
];

export interface DepthToken {
  name: `--${string}`;
  utility: string;
  use: string;
}

/** Elevation, lowest to highest. The values are in tokens.css (they differ per theme). */
export const depths: DepthToken[] = [
  { name: '--raise', utility: 'shadow-raise', use: 'Cards and controls at rest' },
  { name: '--lift', utility: 'shadow-lift', use: 'Panes, hovered cards, the composer' },
  { name: '--float', utility: 'shadow-float', use: 'Menus, vote dock, dialogs' },
  { name: '--glow-a', utility: 'shadow-glow-a', use: 'Mind A won, or is selected' },
  { name: '--glow-b', utility: 'shadow-glow-b', use: 'Mind B won, or is selected' },
];

/** Spring for layout changes (Motion `layout`) and the mode switch indicator. */
export const spring = { type: 'spring', stiffness: 380, damping: 32 } as const;

export function tokenValue(name: string, theme: ThemeName): string | undefined {
  return colorTokens.find(token => token.name === name)?.[theme];
}
