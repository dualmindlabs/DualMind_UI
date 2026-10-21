import type { CSSProperties } from 'react';

import type { ThemePreference } from '@/lib/theme/theme';
import { cn } from '@/lib/utils/cn';
import { colorTokens, type ThemeName } from '@/styles/tokens';

type PaletteKey = 'bg' | 'surface' | 'line' | 'fg' | 'muted' | 'mindA' | 'mindB' | 'human';

const TOKEN_FOR: Record<PaletteKey, `--${string}`> = {
  bg: '--bg',
  surface: '--surface-2',
  line: '--line-subtle',
  fg: '--fg-soft',
  muted: '--muted',
  mindA: '--mind-a',
  mindB: '--mind-b',
  human: '--human',
};

/**
 * The other theme's colours, from the token table (tokens.ts, which tests/unit/tokens.test.ts
 * keeps equal to tokens.css). The page's own tokens cannot show a light preview in dark mode, so
 * this picture is the one place outside /design/ that reads them as values.
 */
function palette(theme: ThemeName): Record<PaletteKey, string> {
  const value = (name: `--${string}`) => colorTokens.find(token => token.name === name)?.[theme];
  return Object.fromEntries(
    Object.entries(TOKEN_FOR).map(([key, name]) => [key, value(name) ?? 'transparent']),
  ) as Record<PaletteKey, string>;
}

const PALETTES: Record<ThemeName, Record<PaletteKey, string>> = {
  dark: palette('dark'),
  light: palette('light'),
};

/** A miniature arena: a header, two answer panes (Mind A, Mind B) and the composer. */
function MiniArena({ theme, style }: { theme: ThemeName; style?: CSSProperties }) {
  const colors = PALETTES[theme];
  const bar = (width: string, color = colors.muted): CSSProperties => ({
    width,
    backgroundColor: color,
  });
  return (
    <span className="absolute inset-0 grid grid-rows-[auto_1fr_auto]" style={{ ...style, backgroundColor: colors.bg }}>
      <span className="flex h-3.5 items-center gap-1 border-b px-2" style={{ borderColor: colors.line }}>
        <span className="h-1 rounded-full" style={bar('1.25rem', colors.fg)} />
        <span className="ml-auto size-1.5 rounded-full" style={{ backgroundColor: colors.human }} />
      </span>
      <span className="grid grid-cols-2 gap-1.5 p-2">
        {([colors.mindA, colors.mindB] as const).map((edge, index) => (
          <span
            key={index}
            className="grid content-start gap-1 rounded-[4px] border border-t-2 p-1.5"
            style={{ backgroundColor: colors.surface, borderColor: colors.line, borderTopColor: edge }}
          >
            <span className="h-1 rounded-full" style={bar('80%', colors.fg)} />
            <span className="h-1 rounded-full" style={bar('64%')} />
            <span className="h-1 rounded-full" style={bar('72%')} />
          </span>
        ))}
      </span>
      <span className="mx-2 mb-2 h-3 rounded-full border" style={{ backgroundColor: colors.surface, borderColor: colors.line }} />
    </span>
  );
}

/** The picture on a theme card: dark, light, or both split along the diagonal for System. */
export function ThemePreview({ preference, className }: { preference: ThemePreference; className?: string }) {
  return (
    <span
      className={cn(
        'relative block aspect-[16/9] w-full overflow-hidden rounded-md border border-line',
        className,
      )}
    >
      {preference === 'system' ? (
        <>
          <MiniArena theme="dark" />
          <MiniArena theme="light" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
        </>
      ) : (
        <MiniArena theme={preference} />
      )}
    </span>
  );
}
