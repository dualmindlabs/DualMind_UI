import type { ReactNode } from 'react';
import { LINKS } from '@/content/links';
import { providerLabel, STATS_URL, type ArenaStatsState } from '@/lib/arena-stats';
import CountUp from './reactbits/CountUp';
import DecryptedText from './reactbits/DecryptedText';
import { ArrowUpRight } from './icons';
import { SectionHeading } from './SectionHeading';

const TOP = 5;

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="link-sweep inline-flex items-center gap-1 text-fg-soft">
      {children}
      <ArrowUpRight className="size-3.5" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

/** The top of the real leaderboard, read live from the Arena's public API. */
export function Leaderboard({ stats }: { stats: ArenaStatsState }) {
  return (
    <section
      id="leaderboard"
      aria-labelledby="leaderboard-title"
      className="mx-auto max-w-[1200px] scroll-mt-8 px-4 pb-24 sm:px-8 sm:pb-32"
    >
      <SectionHeading
        id="leaderboard-title"
        index="03"
        label="Live from the Arena"
        lede="Read from the Arena’s public API as this page loaded. Every model starts at 1000 ELO; beating a stronger model earns more points than beating a weaker one."
      >
        The leaderboard, <span className="human">right now.</span>
      </SectionHeading>

      <div className="mt-12 overflow-hidden rounded-[24px] border border-line bg-surface/80" data-testid="leaderboard">
        <div className="flex items-center justify-between border-b border-line-soft px-4 py-3.5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted sm:px-6">
          <span className="inline-flex items-center gap-2">
            {stats.status === 'ready' && <span className="live-dot" aria-hidden="true" />}
            Top {TOP} by ELO
          </span>
          <span className="hidden sm:inline">ELO</span>
        </div>

        {stats.status === 'error' ? (
          <p className="px-4 py-10 text-center text-[15px] text-fg-soft sm:px-6">
            The live leaderboard didn’t load just now.{' '}
            <a href={LINKS.leaderboardDocs} target="_blank" rel="noopener noreferrer" className="link-sweep text-cyan">
              See it in the docs
            </a>
            .
          </p>
        ) : (
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Top {TOP} models in DualMind Arena by ELO rating</caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Model, provider, battles and win rate</th>
                <th scope="col">ELO</th>
              </tr>
            </thead>
            <tbody>
              {stats.status === 'loading'
                ? Array.from({ length: TOP }, (_, row) => (
                    <tr key={row} className="border-b border-line-soft last:border-b-0" aria-hidden="true">
                      <td className="w-12 py-5 pl-4 sm:w-16 sm:pl-6">
                        <span className="skeleton block h-4 w-6" />
                      </td>
                      <td className="py-5 pr-3">
                        <span className="skeleton block h-4 w-[min(260px,70%)]" />
                        <span className="skeleton mt-2.5 block h-3 w-[min(180px,50%)]" />
                      </td>
                      <td className="py-5 pr-4 text-right sm:pr-6">
                        <span className="skeleton ml-auto block h-6 w-14" />
                      </td>
                    </tr>
                  ))
                : stats.data.models.slice(0, TOP).map((model, row) => (
                    <tr key={model.id} className="group border-b border-line-soft transition-colors last:border-b-0 hover:bg-elevated/50">
                      <td className="w-12 py-5 pl-4 align-top font-mono text-[13px] text-muted tabular-nums sm:w-16 sm:pl-6">
                        {String(model.rank || row + 1).padStart(2, '0')}
                      </td>
                      <td className="py-5 pr-3 align-top">
                        <div className="model-name font-mono text-[13px] leading-snug text-fg sm:text-[15px]">
                          <DecryptedText
                            text={model.name}
                            animateOn="view"
                            sequential
                            speed={22}
                            characters="abcdefghijklmnopqrstuvwxyz0123456789-."
                            encryptedClassName="text-muted"
                          />
                        </div>
                        <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">
                          {providerLabel(model.provider)} · {model.winRate.toFixed(1)}% wins
                        </p>
                        <div className="mt-3 h-[3px] w-full max-w-[320px] overflow-hidden rounded-full bg-line-soft" aria-hidden="true">
                          <div
                            className="h-full rounded-full bg-linear-to-r from-cyan to-violet"
                            style={{ width: `${Math.min(100, Math.max(0, model.winRate))}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-5 pr-4 text-right align-top sm:pr-6">
                        <span className="text-[24px] leading-none font-light tracking-[-0.03em] text-fg tabular-nums sm:text-[30px]">
                          <CountUp from={1000} to={Math.round(model.elo)} duration={1.6} delay={row * 0.08} mode="roll" />
                        </span>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        )}

        <div className="flex flex-col gap-3 border-t border-line-soft px-4 py-4 font-mono text-[11px] tracking-[0.04em] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="break-all">
            Source: <span className="text-fg-soft">{STATS_URL.replace('https://', '')}</span>
          </span>
          <span className="flex flex-wrap gap-x-5 gap-y-2">
            <ExternalLink href={LINKS.leaderboardDocs}>How ELO works</ExternalLink>
            <ExternalLink href={LINKS.apiReference}>API reference</ExternalLink>
          </span>
        </div>
      </div>
    </section>
  );
}
