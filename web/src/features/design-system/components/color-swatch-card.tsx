import type { ColorToken, ThemeName } from '@/styles/tokens';

import { ContrastNote } from './contrast-note';

const themes: readonly ThemeName[] = ['dark', 'light'];

/** One colour token: a live swatch (current theme) and both theme values with their contrast. */
export function ColorSwatchCard({ token }: { token: ColorToken }) {
  return (
    <li className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-raise">
      {token.against ? (
        <div aria-hidden="true" className="grid h-20 grid-cols-2 border-b border-line">
          {token.against.map(name => (
            <div
              key={name}
              className="grid place-items-center text-h3 font-semibold"
              style={{ backgroundColor: `var(${name})`, color: `var(${token.name})` }}
            >
              Aa
            </div>
          ))}
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="flex h-20 items-end border-b border-line px-4 pb-3"
          style={{ backgroundColor: `var(${token.name})` }}
        >
          {token.kind === 'surface' ? (
            <span className="text-h3 font-semibold text-fg">
              Aa <span className="text-ui font-normal text-fg-soft">on {token.name}</span>
            </span>
          ) : null}
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h4 className="text-ui font-semibold text-fg">{token.label}</h4>
          <code className="text-caption text-muted">{token.name}</code>
        </div>
        <p className="mt-1 text-ui-sm text-fg-soft">{token.use}</p>
        <dl className="mt-auto space-y-2 pt-4">
          {themes.map(theme => (
            <div key={theme} className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-start gap-2">
              <dt className="pt-1 eyebrow text-muted">{theme}</dt>
              <dd className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-ui-sm">
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-full border border-line-strong"
                  style={{ backgroundColor: token[theme] }}
                />
                <span className="font-code text-caption text-fg uppercase">{token[theme]}</span>
                <ContrastNote token={token} theme={theme} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </li>
  );
}
