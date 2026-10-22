import { Eyebrow } from '@/components/ui/eyebrow';
import { SectionTitle } from '@/components/ui/section-title';
import { Skeleton } from '@/components/ui/skeleton';
import { StatTile } from '@/components/ui/stat-tile';

import { KitCard, KitState } from './kit-card';

/** The Duel Editorial building blocks: eyebrow, section title, stat tile, skeleton. */
export function KitFoundation() {
  return (
    <KitCard
      title="Eyebrows, titles, stats and skeletons"
      source="@/components/ui/eyebrow, section-title, stat-tile, skeleton"
      description="The pieces every redesigned page is built from. The eyebrow is for data; the kicker leads into a heading; stats are always tabular; skeletons shimmer with transform only and stand still under reduced motion."
      className="lg:col-span-2"
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <KitState label="Section title with kicker, serif heading and italic accent">
          <SectionTitle
            level="h3"
            kicker="How a battle works"
            title="Ask once."
            accent="Judge twice."
            lead="Two answers arrive side by side. Names stay hidden until you vote."
          />
        </KitState>
        <div className="grid gap-6">
          <KitState label="Eyebrows by tone">
            <Eyebrow>Muted</Eyebrow>
            <Eyebrow tone="soft">Soft</Eyebrow>
            <Eyebrow tone="a">Model A</Eyebrow>
            <Eyebrow tone="b">Model B</Eyebrow>
            <Eyebrow tone="human">Your pick</Eyebrow>
          </KitState>
          <KitState label="Skeleton">
            <div className="grid w-full max-w-sm gap-2.5" role="status" aria-busy="true">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <span className="sr-only">Loading the answer</span>
            </div>
          </KitState>
        </div>
      </div>
      <KitState label="Stat tiles: neutral, Mind A, Mind B" className="w-full">
        <div className="grid w-full gap-4 sm:grid-cols-3">
          <StatTile label="Battles today" value="12,408" hint="Across 41 models" />
          <StatTile
            label="Top model"
            value="1,284"
            delta="7.2"
            trend="up"
            tone="a"
            hint="Elo, 63% win rate"
          />
          <StatTile
            label="Biggest drop"
            value="1,102"
            delta="3.8"
            trend="down"
            tone="b"
            hint="Elo, last 7 days"
          />
        </div>
      </KitState>
    </KitCard>
  );
}
