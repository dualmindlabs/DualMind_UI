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
          Geist sets everything you read, from a 136px display down to the answer text, with tight
          negative tracking as it grows. Geist Mono holds the data and keeps numbers in columns. Two
          families, self-hosted through Fontsource and subset to Latin: about 52 KB for everything
          above the fold, both preloaded.
        </p>
      }
    >
      <div className="surface-duel relative isolate overflow-hidden p-6 sm:p-10">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-grid" />
        <p className="kicker">The verdict, in display</p>
        <p className="mt-6 max-w-[16ch] text-display text-fg">
          Which answer is <span className="human-voice text-human">better?</span>
        </p>
        <p className="mt-8 max-w-[56ch] text-lead text-fg-soft">
          One precise grotesque for everything you read twice, and mono wherever a number has to
          line up.
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
