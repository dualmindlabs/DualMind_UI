import { type ColorToken, colorTokens } from '@/styles/tokens';

import { ColorSwatchCard } from './color-swatch-card';
import { Section } from './section';

function groupTokens(tokens: readonly ColorToken[]): Array<[ColorToken['group'], ColorToken[]]> {
  const groups = new Map<ColorToken['group'], ColorToken[]>();
  for (const token of tokens) {
    groups.set(token.group, [...(groups.get(token.group) ?? []), token]);
  }
  return [...groups.entries()];
}

export function ColorSection() {
  return (
    <Section
      id="colour"
      title={
        <>
          Midnight and Paper, two minds <span className="human-voice text-human">and you.</span>
        </>
      }
      lead={
        <>
          <p>
            Every colour is a token with a dark and a light value; components never use a hex code.
            The swatch shows the theme you are in, the rows show both. Ratios use the WCAG 2.x
            formula against each theme&apos;s page background.
          </p>
          <p className="mt-4 text-ui-sm text-muted">
            Text needs 4.5:1, control borders and fills 3:1. Hairlines and surfaces are decorative.
          </p>
        </>
      }
    >
      <div className="space-y-14">
        {groupTokens(colorTokens).map(([group, tokens]) => (
          <div key={group}>
            <h3 className="text-h3 font-semibold">{group}</h3>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tokens.map(token => (
                <ColorSwatchCard key={token.name} token={token} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}
