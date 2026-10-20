import type { DesignSection } from '../types';

export const designSections: readonly DesignSection[] = [
  { id: 'colour', index: '01', title: 'Colour', summary: 'Tokens and contrast' },
  { id: 'roles', index: '02', title: 'Roles', summary: 'Mind A, Mind B, Human' },
  { id: 'type', index: '03', title: 'Type', summary: 'Four voices, one scale' },
  { id: 'controls', index: '04', title: 'Controls', summary: 'Buttons, fields, focus' },
  { id: 'space', index: '05', title: 'Space', summary: 'Radius, spacing, depth' },
  { id: 'motion', index: '06', title: 'Motion', summary: 'Durations and easing' },
];

export function getSection(id: string): DesignSection {
  const section = designSections.find(item => item.id === id);
  if (!section) throw new Error(`Unknown design section "${id}"`);
  return section;
}
