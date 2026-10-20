import { THEME_SCRIPT } from '@/lib/theme/theme';

/** Sets <html data-theme> from localStorage before the first paint (see lib/theme/theme.ts). */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
