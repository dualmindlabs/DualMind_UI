import { cn } from '@/lib/utils/cn';
import { formatRatio } from '@/lib/utils/contrast';
import type { ColorToken, ThemeName } from '@/styles/tokens';

import { contrastReadings } from '../lib/token-contrast';

/** The contrast of one token in one theme, with its WCAG grade. */
export function ContrastNote({ token, theme }: { token: ColorToken; theme: ThemeName }) {
  if (token.kind === 'surface') return <span className="text-caption text-muted">Surface</span>;

  return contrastReadings(token, theme).map(reading => (
    <span key={reading.against} className="inline-flex items-center gap-1.5 text-caption">
      <span className="text-fg-soft tabular-nums">
        {formatRatio(reading.ratio)}
        {reading.against === 'background' ? '' : ` on ${reading.against}`}
      </span>
      <span
        className={cn(
          'rounded-full border px-1.5 py-px font-mono text-label leading-4 tracking-normal',
          reading.target === null
            ? 'border-line text-muted'
            : reading.passes
              ? 'border-ok/40 text-ok'
              : 'border-bad/50 text-bad',
        )}
      >
        {reading.target === null ? 'Decorative' : reading.grade}
      </span>
    </span>
  ));
}
