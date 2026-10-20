import { cn } from '@/lib/utils/cn';

import { leaderboardSample, typeScale, typeVoices } from '../lib/type-scale';
import { Section } from './section';
import { TypeSpecimen } from './type-specimen';

export function TypeSection() {
  return (
    <Section
      id="type"
      title={
        <>
          Four voices, <span className="human-voice text-human">one scale.</span>
        </>
      }
      lead={
        <p>
          Bricolage Grotesque carries the machine voice, Playfair Display italic the human one, DM
          Mono the labels and JetBrains Mono the code. All self-hosted through Fontsource, with
          the two critical files preloaded.
        </p>
      }
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {typeVoices.map(voice => (
          <li
            key={voice.voice}
            className="flex flex-col rounded-lg border border-line bg-surface p-5 shadow-raise"
          >
            <p aria-hidden="true" className={cn('text-h1 leading-none', voice.className)}>
              {voice.sample}
            </p>
            <h3 className="mt-6 text-ui font-semibold text-fg">{voice.voice}</h3>
            <p className="text-ui-sm text-fg-soft">{voice.family}</p>
            <p className="mt-2 text-caption text-muted">{voice.use}</p>
          </li>
        ))}
      </ul>

      <h3 className="mt-14 text-h3 font-semibold">Scale</h3>
      <div className="mt-5 divide-y divide-line border-y border-line">
        {typeScale.map(step => (
          <TypeSpecimen key={step.name} {...step} />
        ))}
      </div>

      <h3 className="mt-14 text-h3 font-semibold">Numbers</h3>
      <div className="mt-5 rounded-lg border border-line bg-surface">
        <table className="w-full text-left text-ui">
          <caption className="px-3 pt-4 text-left text-caption text-muted sm:px-4">
            Tabular figures for Elo, counts and timings, so columns line up.
          </caption>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="eyebrow px-2 py-3 sm:px-4 font-medium text-muted">
                Rank
              </th>
              <th scope="col" className="eyebrow px-2 py-3 sm:px-4 font-medium text-muted">
                Model
              </th>
              <th scope="col" className="eyebrow px-2 py-3 sm:px-4 text-right font-medium text-muted">
                Elo
              </th>
              <th
                scope="col"
                className="eyebrow px-2 py-3 text-right font-medium text-muted max-sm:hidden sm:px-4"
              >
                Battles
              </th>
              <th scope="col" className="eyebrow px-2 py-3 sm:px-4 text-right font-medium text-muted">
                Win rate
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line tabular-nums">
            {leaderboardSample.map(row => (
              <tr key={row.rank}>
                <td className="px-2 py-3 sm:px-4 font-mono text-muted">{row.rank}</td>
                <td className="px-2 py-3 sm:px-4 font-medium text-fg">{row.model}</td>
                <td className="px-2 py-3 sm:px-4 text-right text-fg">{row.elo}</td>
                <td className="px-2 py-3 text-right text-fg-soft max-sm:hidden sm:px-4">{row.battles}</td>
                <td className="px-2 py-3 sm:px-4 text-right text-fg-soft">{row.winRate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
