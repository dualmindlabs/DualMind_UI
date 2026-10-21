import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from 'recharts';

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartTooltipItem,
} from '@/components/ui/chart';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';

import { formatCount, formatPercent } from '../lib/format';
import type { LeaderboardEntry } from '../types';

export interface WinRateChartProps {
  /** Every model on the board. */
  entries: readonly LeaderboardEntry[];
  /** The model the chart is about. */
  selectedId: string;
  /** The board's mean win rate, in percent. */
  average: number;
}

interface Datum {
  id: string;
  name: string;
  winRate: number;
  battles: number;
  selected: boolean;
}

const config = {
  winRate: { label: 'Win rate', color: '--line-strong' },
  selected: { label: 'This model', color: '--mind-a' },
} satisfies ChartConfig;

function isDatum(value: unknown): value is Datum {
  return typeof value === 'object' && value !== null && 'winRate' in value && 'name' in value;
}

function tooltipRow(item: ChartTooltipItem) {
  if (!isDatum(item.payload)) return null;
  const datum = item.payload;
  return (
    <span className="grid gap-0.5">
      <span className="font-medium text-fg">{datum.name}</span>
      <span className="font-mono text-fg-soft tabular-nums">
        {formatPercent(datum.winRate)} win rate · {formatCount(datum.battles)} battles
      </span>
    </span>
  );
}

/**
 * Where this model's win rate sits on the board: one column per model, sorted from the highest
 * win rate, this model in the Mind A accent and the rest neutral, with the board's average as a
 * hairline. Hover shows each model. Loaded lazily (Recharts), only when a details sheet opens.
 * The chart is one image for assistive technology with a one-line summary (the text next to it
 * has the rest), so it adds no extra tab stop.
 */
export function WinRateChart({ entries, selectedId, average }: WinRateChartProps) {
  const reduce = useShouldReduceMotion();
  const data: Datum[] = [...entries]
    .sort((a, b) => b.winRate - a.winRate || a.rank - b.rank)
    .map(entry => ({
      id: entry.id,
      name: entry.name,
      winRate: entry.winRate,
      battles: entry.battles,
      selected: entry.id === selectedId,
    }));

  const selected = data.find(datum => datum.selected);
  const summary = selected
    ? `Bar chart of win rate for ${formatCount(data.length)} models, highest first. ${selected.name} wins ${formatPercent(selected.winRate)}; the board average is ${formatPercent(average)}.`
    : `Bar chart of win rate for ${formatCount(data.length)} models, highest first. The board average is ${formatPercent(average)}.`;

  return (
    <div className="grid gap-2.5">
      <ChartContainer
        role="img"
        aria-label={summary}
        config={config}
        className="h-44 w-full"
        initialDimension={{ width: 360, height: 176 }}
      >
        <BarChart
          accessibilityLayer={false}
          data={data}
          margin={{ top: 10, right: 4, bottom: 6, left: 0 }}
          barCategoryGap={1}
        >
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="0" />
          <XAxis dataKey="name" hide />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            interval={0}
            tickFormatter={(value: number) => `${value}%`}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <ReferenceLine
            y={average}
            stroke="var(--fg-soft)"
            strokeWidth={1}
            ifOverflow="extendDomain"
          />
          <ChartTooltip
            cursor={{ fill: 'var(--hover)' }}
            content={<ChartTooltipContent hideLabel formatter={tooltipRow} />}
          />
          <Bar dataKey="winRate" radius={[2, 2, 0, 0]} maxBarSize={24} isAnimationActive={!reduce}>
            {data.map(datum => (
              <Cell
                key={datum.id}
                fill={datum.selected ? 'var(--color-selected)' : 'var(--color-winRate)'}
                fillOpacity={datum.selected ? 1 : 0.55}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-fg-soft">
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-[2px] bg-mind-a" />
          This model
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-[2px] bg-line-strong/55" />
          Other models
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-px w-3.5 bg-fg-soft" />
          Board average{' '}
          <span className="font-mono text-fg tabular-nums">{formatPercent(average)}</span>
        </li>
      </ul>
    </div>
  );
}
