/** Radius and spacing scales from design-direction.md section 5. */
export const radii: ReadonlyArray<{ name: string; value: string; use: string; className: string }> =
  [
    { name: 'sm', value: '6px', use: 'Chips, inputs', className: 'rounded-sm' },
    { name: 'md', value: '10px', use: 'Buttons, small cards', className: 'rounded-md' },
    { name: 'lg', value: '14px', use: 'Cards, panes', className: 'rounded-lg' },
    { name: 'xl', value: '20px', use: 'Composer, dialogs', className: 'rounded-xl' },
    { name: 'full', value: '9999px', use: 'Pills, avatars', className: 'rounded-full' },
  ];

export const containers: ReadonlyArray<{ name: string; value: string; use: string }> = [
  { name: 'max-w-page', value: '1200px', use: 'Marketing pages' },
  { name: 'max-w-reading', value: '68ch', use: 'Prose and answers' },
  { name: 'Gutters', value: '24px / 16px', use: 'Desktop / phones' },
  { name: 'App header', value: '56px', use: 'Sticky, translucent' },
];

/** The 4px grid. Tailwind's spacing unit is 4px, so `p-4` is 16px. */
export const spacing: readonly number[] = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96, 128];

export const surfaces: ReadonlyArray<{ token: string; use: string; className: string }> = [
  { token: '--bg-deep', use: 'Hero and footer', className: 'bg-bg-deep' },
  { token: '--bg', use: 'Page', className: 'bg-bg' },
  { token: '--surface', use: 'Cards and panes', className: 'bg-surface shadow-raise' },
  {
    token: '--surface-2',
    use: 'Menus and composer',
    className: 'bg-surface-2 shadow-raise-strong',
  },
];
