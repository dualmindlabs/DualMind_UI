/**
 * Chart: the frame, tooltip and colour config for Recharts charts.
 * Source: shadcn/ui `chart` (base-vega), MIT, see ./LICENSE.md.
 * Changes: series colours are design tokens (`color: '--mind-a'`) set as CSS variables on the
 * frame's style attribute instead of an injected <style> element (no raw HTML, and the tokens
 * already switch with the theme); axis text and cursor in token colours (pass grid and reference
 * line strokes as `var(--line)` props instead of restyling Recharts' default grey); a quiet raised
 * tooltip with tabular numbers and a `formatter` that returns the whole row; the legend parts
 * are left out until a chart needs one. Recharts is heavy: import this file only from a module
 * that is itself loaded lazily (React.lazy), so it never lands in a page's first bundle.
 */
import {
  type ComponentProps,
  createContext,
  type CSSProperties,
  type ReactNode,
  useContext,
  useId,
} from 'react';
import * as RechartsPrimitive from 'recharts';

import { cn } from '@/lib/utils/cn';

/** One series: its label for tooltips and legends, and its colour token. */
export type ChartConfig = Record<string, { label?: ReactNode; color?: `--${string}` }>;

interface ChartContextValue {
  config: ChartConfig;
}

const ChartContext = createContext<ChartContextValue | null>(null);

export function useChart(): ChartContextValue {
  const context = useContext(ChartContext);
  if (!context) throw new Error('useChart() must be used inside <ChartContainer>.');
  return context;
}

export interface ChartContainerProps extends Omit<ComponentProps<'div'>, 'children'> {
  config: ChartConfig;
  /** One Recharts chart (BarChart, LineChart...). */
  children: ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
  /** The size to lay out at before the container is measured. */
  initialDimension?: { width: number; height: number };
}

/**
 * The chart frame: sizes the chart to its box (give it a height or an aspect ratio), exposes each
 * series colour as `var(--color-<key>)`, and draws axes, grid and cursor in token colours.
 */
export function ChartContainer({
  id,
  className,
  style,
  children,
  config,
  initialDimension = { width: 320, height: 200 },
  ...props
}: ChartContainerProps) {
  const uniqueId = useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, '')}`;
  const colors = Object.fromEntries(
    Object.entries(config).flatMap(([key, item]) =>
      item.color ? [[`--color-${key}`, `var(${item.color})`]] : [],
    ),
  ) as CSSProperties;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        style={{ ...colors, ...style }}
        className={cn(
          'flex justify-center text-caption [&_.recharts-cartesian-axis-tick_text]:fill-muted [&_.recharts-cartesian-axis-tick_text]:tabular-nums',
          '[&_.recharts-curve.recharts-tooltip-cursor]:stroke-line-strong [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-hover',
          '[&_.recharts-layer]:outline-hidden [&_.recharts-surface]:outline-hidden',
          className,
        )}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer initialDimension={initialDimension}>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export const ChartTooltip = RechartsPrimitive.Tooltip;

/** What Recharts passes to a tooltip's content element for each hovered series. */
export interface ChartTooltipItem {
  name?: string | number;
  value?: unknown;
  dataKey?: unknown;
  color?: string;
  /** The hovered data point. */
  payload?: unknown;
}

export interface ChartTooltipContentProps {
  /** Injected by Recharts. */
  active?: boolean;
  /** Injected by Recharts. */
  payload?: readonly ChartTooltipItem[];
  /** Injected by Recharts: the category of the hovered point. */
  label?: unknown;
  /** Replaces the label line (the category). Return null to hide it. */
  labelFormatter?: (label: unknown, payload: readonly ChartTooltipItem[]) => ReactNode;
  /** Replaces the whole row of one series. */
  formatter?: (item: ChartTooltipItem, index: number) => ReactNode;
  hideLabel?: boolean;
  className?: string;
}

/** The tooltip box: the hovered category, then one row per series with its colour and value. */
export function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  formatter,
  hideLabel = false,
  className,
}: ChartTooltipContentProps) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;

  const heading = hideLabel ? null : labelFormatter ? labelFormatter(label, payload) : label;

  return (
    <div
      className={cn(
        'grid max-w-64 min-w-36 gap-1.5 rounded-md border border-line bg-surface-2 px-2.5 py-2 text-caption text-fg shadow-raise-strong',
        className,
      )}
    >
      {heading !== null && heading !== undefined && heading !== '' ? (
        <div className="font-medium text-fg">{heading as ReactNode}</div>
      ) : null}
      <div className="grid gap-1">
        {payload.map((item, index) => {
          if (formatter) return <div key={index}>{formatter(item, index)}</div>;
          const key = typeof item.dataKey === 'string' ? item.dataKey : String(item.name ?? '');
          const series = config[key];
          return (
            <div key={index} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-[2px]"
                style={{ background: item.color ?? `var(--color-${key})` }}
              />
              <span className="text-muted">{series?.label ?? item.name}</span>
              <span className="ml-auto font-mono font-medium text-fg tabular-nums">
                {typeof item.value === 'number'
                  ? item.value.toLocaleString('en-US')
                  : typeof item.value === 'string'
                    ? item.value
                    : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
