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

export const backgrounds: Record<ThemeName, string> = { dark: '#0F1115', light: '#FFFFFF' };

export const colorTokens: ColorToken[] = [
  {
    name: '--bg',
    label: 'Background',
    use: 'Page background, graphite ink in dark mode',
    kind: 'surface',
    group: 'Surfaces',
    dark: '#0F1115',
    light: '#FFFFFF',
  },
  {
    name: '--bg-deep',
    label: 'Deep background',
    use: 'Hero, footer and sections',
    kind: 'surface',
    group: 'Surfaces',
    dark: '#0A0B0E',
    light: '#F7F7F5',
  },
  {
    name: '--surface',
    label: 'Surface',
    use: 'Cards, panes, sidebar',
    kind: 'surface',
    group: 'Surfaces',
    dark: '#13161C',
    light: '#FAFAF8',
  },
  {
    name: '--surface-2',
    label: 'Raised surface',
    use: 'Menus, popovers, composer',
    kind: 'surface',
    group: 'Surfaces',
    dark: '#1A1E25',
    light: '#FFFFFF',
  },
  {
    name: '--line-subtle',
    label: 'Hairline',
    use: 'Dividers, used as --line',
    kind: 'decorative',
    group: 'Lines',
    dark: '#2A3038',
    light: '#E4E4E0',
  },
  {
    name: '--line-strong',
    label: 'Control border',
    use: 'Inputs and control borders',
    kind: 'control',
    group: 'Lines',
    dark: '#636B78',
    light: '#7D838E',
  },
  {
    name: '--fg',
    label: 'Foreground',
    use: 'Body text',
    kind: 'text',
    group: 'Text',
    dark: '#E6E8EB',
    light: '#14161B',
  },
  {
    name: '--fg-soft',
    label: 'Soft foreground',
    use: 'Secondary text',
    kind: 'text',
    group: 'Text',
    dark: '#B8BCC4',
    light: '#3D424B',
  },
  {
    name: '--muted',
    label: 'Muted',
    use: 'Captions and metadata',
    kind: 'text',
    group: 'Text',
    dark: '#8C919A',
    light: '#5F6571',
  },
  {
    name: '--mind-a',
    label: 'Mind A',
    use: 'The first model: accents, text, badges',
    kind: 'text',
    group: 'Roles',
    dark: '#00D9FF',
    light: '#09738F',
  },
  {
    name: '--mind-b',
    label: 'Mind B',
    use: 'The second model: fills and borders',
    kind: 'fill',
    group: 'Roles',
    dark: '#8B5CF6',
    light: '#6D28D9',
  },
  {
    name: '--mind-b-text',
    label: 'Mind B text',
    use: 'The second model: text',
    kind: 'text',
    group: 'Roles',
    dark: '#A78BFA',
    light: '#6D28D9',
  },
  {
    name: '--human',
    label: 'Human',
    use: 'Your prompt, your vote, your winner',
    kind: 'text',
    group: 'Roles',
    dark: '#CB9275',
    light: '#9A5434',
  },
  {
    name: '--ok',
    label: 'OK',
    use: 'Success and online states',
    kind: 'text',
    group: 'Status',
    dark: '#34D399',
    light: '#047857',
  },
  {
    name: '--warn',
    label: 'Warning',
    use: 'Provisional and degraded states',
    kind: 'text',
    group: 'Status',
    dark: '#FBBF24',
    light: '#A16207',
  },
  {
    name: '--bad',
    label: 'Error',
    use: 'Errors and destructive actions',
    kind: 'text',
    group: 'Status',
    dark: '#F87171',
    light: '#B91C1C',
  },
  {
    name: '--focus',
    label: 'Focus ring',
    use: '2px ring, 3px offset',
    kind: 'control',
    group: 'Focus and accents',
    dark: '#00D9FF',
    light: '#09738F',
  },
  {
    name: '--on-accent',
    label: 'On accent',
    use: 'Text on Mind A and Human buttons',
    kind: 'text',
    group: 'Focus and accents',
    dark: '#0A0B0E',
    light: '#FFFFFF',
    against: ['--mind-a', '--human'],
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
  { name: '--dur-base', ms: 240, use: 'Panels, tabs, list changes' },
  { name: '--dur-slow', ms: 420, use: 'Page transitions, drawers' },
  { name: '--dur-cinematic', ms: 900, use: 'Hero entrance and the reveal only' },
];

export interface EasingToken {
  name: `--${string}`;
  points: [number, number, number, number];
  use: string;
}

export const easings: EasingToken[] = [
  { name: '--ease-out-expo', points: [0.22, 1, 0.36, 1], use: 'Default for entrances' },
  { name: '--ease-in-out', points: [0.65, 0, 0.35, 1], use: 'Moves and morphs' },
];

/** Spring for layout changes (Motion `layout`) and the mode switch indicator. */
export const spring = { type: 'spring', stiffness: 380, damping: 32 } as const;

export function tokenValue(name: string, theme: ThemeName): string | undefined {
  return colorTokens.find(token => token.name === name)?.[theme];
}
