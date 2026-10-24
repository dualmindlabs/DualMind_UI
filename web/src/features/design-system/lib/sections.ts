import type { DesignSection } from '../types';

export const designSections: readonly DesignSection[] = [
  { id: 'colour', index: '01', title: 'Colour', summary: 'Tokens and contrast' },
  { id: 'roles', index: '02', title: 'Roles', summary: 'Mind A, Mind B, Human' },
  { id: 'type', index: '03', title: 'Type', summary: 'Four voices, one scale' },
  { id: 'controls', index: '04', title: 'Controls', summary: 'Buttons, fields, focus' },
  { id: 'space', index: '05', title: 'Space', summary: 'Radius, spacing, depth' },
  { id: 'depth', index: '06', title: 'Depth', summary: 'Surfaces, glow, grain' },
  { id: 'motion', index: '07', title: 'Motion', summary: 'Durations and easing' },
  { id: 'components', index: '08', title: 'Components', summary: 'The UI kit, in every state' },
  { id: 'shell', index: '09', title: 'Shell', summary: 'Header, menu, palette, toasts' },
  { id: 'effects', index: '10', title: 'Effects', summary: 'Vendored, gated, accessible' },
];

export function getSection(id: string): DesignSection {
  const section = designSections.find(item => item.id === id);
  if (!section) throw new Error(`Unknown design section "${id}"`);
  return section;
}
