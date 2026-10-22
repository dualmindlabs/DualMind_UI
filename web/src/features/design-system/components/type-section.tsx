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
          Instrument Serif sets the headlines and, in italic, the human voice. Geist carries the
          interface and every answer. Geist Mono holds the data. Three families, self-hosted through
          Fontsource and subset to Latin: about 96 KB for everything above the fold, with Geist and
          Instrument Serif preloaded.
        </p>
      }
    >
      <div className="surface-duel overflow-hidden mesh-a p-6 sm:p-10">
        <p className="kicker">The verdict, in display</p>
        <p className="mt-6 max-w-[16ch] text-display text-fg">
          Which answer is <em className="human-voice text-human">better?</em>
        </p>
        <p className="mt-8 max-w-[56ch] text-lead text-fg-soft">
          Serif for the moment that matters, a precise grotesque for everything you read twice, and
          mono wherever a number has to line up.
        </p>
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {typeVoices.map(voice => (
          <li key={voice.voice} className="surface-duel flex flex-col p-5">
            <p aria-hidden="true" className={cn('text-h1 leading-none text-fg', voice.className)}>
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
      <div className="surface-duel mt-5 overflow-hidden">
        <table className="w-full text-left text-ui">
          <caption className="px-3 pt-4 text-left text-caption text-muted sm:px-4">
            Tabular figures for Elo, counts and timings, so columns line up.
          </caption>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="px-2 py-3 eyebrow font-medium text-muted sm:px-4">
                Rank
              </th>
              <th scope="col" className="px-2 py-3 eyebrow font-medium text-muted sm:px-4">
                Model
              </th>
              <th
                scope="col"
                className="px-2 py-3 text-right eyebrow font-medium text-muted sm:px-4"
              >
                Elo
              </th>
              <th
                scope="col"
                className="px-2 py-3 text-right eyebrow font-medium text-muted max-sm:hidden sm:px-4"
              >
                Battles
              </th>
              <th
                scope="col"
                className="px-2 py-3 text-right eyebrow font-medium text-muted sm:px-4"
              >
                Win rate
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {leaderboardSample.map(row => (
              <tr key={row.rank}>
                <td className="px-2 py-3 numeric text-muted sm:px-4">{row.rank}</td>
                <td className="px-2 py-3 font-medium text-fg sm:px-4">{row.model}</td>
                <td className="px-2 py-3 text-right numeric text-fg sm:px-4">{row.elo}</td>
                <td className="px-2 py-3 text-right numeric text-fg-soft max-sm:hidden sm:px-4">
                  {row.battles}
                </td>
                <td className="px-2 py-3 text-right numeric text-fg-soft sm:px-4">{row.winRate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
