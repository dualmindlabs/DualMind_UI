import { MOTION_SCRIPT } from '@/lib/motion/motion-preference';
import { THEME_SCRIPT } from '@/lib/theme/theme';

/**
 * Sets <html data-theme> and <html data-motion> from localStorage before the first paint (see
 * lib/theme/theme.ts and lib/motion/motion-preference.ts), in one inline script.
 */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: `${THEME_SCRIPT}${MOTION_SCRIPT}` }} />;
}
