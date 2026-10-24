/** Radius and spacing scales from design-direction.md section 5. */
export const radii: ReadonlyArray<{ name: string; value: string; use: string; className: string }> =
  [
    { name: 'sm', value: '6px', use: 'Chips, inputs', className: 'rounded-sm' },
    { name: 'md', value: '8px', use: 'Buttons, small cards', className: 'rounded-md' },
    { name: 'lg', value: '12px', use: 'Cards, panes', className: 'rounded-lg' },
    { name: 'xl', value: '16px', use: 'Composer, dialogs', className: 'rounded-xl' },
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

/** Layered surfaces, lowest to highest, with the utility that draws each (styles/surfaces.css). */
export const surfaceLevels: ReadonlyArray<{
  utility: string;
  use: string;
  className: string;
  note: string;
}> = [
  {
    utility: 'surface-inset',
    use: 'Wells, code, empty lists',
    className: 'surface-inset',
    note: 'Recessed: deep background and an inner shadow',
  },
  {
    utility: 'shadow-raise',
    use: 'Cards at rest',
    className: 'rounded-lg border border-line bg-surface shadow-raise',
    note: 'One hairline highlight and a 1px shadow',
  },
  {
    utility: 'surface-duel',
    use: 'Panes and featured cards',
    className: 'surface-duel',
    note: 'Lit from the top, with the lift shadow',
  },
  {
    utility: 'surface-float',
    use: 'Menus, vote dock, dialogs',
    className: 'surface-float',
    note: 'The highest: layered float shadow',
  },
];
