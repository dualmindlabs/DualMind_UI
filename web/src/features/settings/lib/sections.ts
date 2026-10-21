/** The settings page's sections, in page order: the section nav and the anchors use these. */
export const SETTINGS_SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'arena', label: 'Arena' },
  { id: 'shortcuts', label: 'Keyboard shortcuts' },
  { id: 'data', label: 'Your data' },
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]['id'];
