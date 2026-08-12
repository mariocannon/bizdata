'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DistributionPoint, DayPoint } from '@/lib/survey'
import { EmptyState } from '@/components/ui/empty-state'

/**
 * Every chart on this page shows one measure — how many people chose an option —
 * so the palette is one hue plus a de-emphasis grey, not a categorical set.
 * Colouring each bar by its own size would double-encode the length the bar
 * already shows.
 *
 * Validated against the white card surface with the skill's checker:
 * accent vs grey ΔE 18.9 protan / 23.5 normal vision (floors are 8 and 15), so
 * the "prefer not to say" bars stay tellable-apart under colour-vision
 * deficiency. The grey is deliberately below the chroma floor and below 3:1
 * against the surface — that is what makes it recede — which puts it under the
 * relief rule, so every bar carries a visible value label.
 */
const ACCENT = '#0891b2'
const MUTED = '#bcc7d2'

const AXIS = 'hsl(var(--muted-foreground))'
const GRID = 'hsl(var(--border))'

const axisTick = { fill: AXIS, fontSize: 11 }

function formatShare(share: number): string {
  const percent = share * 100
  // Sub-1% would otherwise round to a bare "0%".
  if (percent > 0 && percent < 1) return '<1%'
  return `${Math.round(percent)}%`
}

function DistributionTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload?: DistributionPoint }[]
}) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null

  return (
    <div className="max-w-64 rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md">
      {/* The full option text — the axis carries a shortened version. */}
      <p className="font-semibold text-foreground">{point.option}</p>
      <p className="tabular mt-1 text-muted-foreground">
        {point.count} {point.count === 1 ? 'response' : 'responses'} ·{' '}
        {formatShare(point.share)}
      </p>
    </div>
  )
}

/**
 * A ranked (or scale-ordered) horizontal bar. Horizontal because the option
 * labels are words, not dates — vertical columns would turn every one of them
 * on its side.
 */
export function DistributionChart({
  data,
  labelWidth,
}: {
  data: DistributionPoint[]
  /** Override when a card sits in a narrow column. */
  labelWidth?: number
}) {
  if (data.length === 0) {
    return <EmptyState title="No answers yet" className="py-8" />
  }

  const longest = data.reduce((max, point) => Math.max(max, point.label.length), 0)
  // ~5.9px per character at 11px, clamped so one long label can't eat the plot.
  const width = labelWidth ?? Math.min(150, Math.max(56, Math.round(longest * 5.9) + 10))

  const rows = data.map((point) => ({
    ...point,
    tip: `${point.count}  ·  ${formatShare(point.share)}`,
  }))

  return (
    <ResponsiveContainer width="100%" height={Math.max(84, data.length * 30 + 12)}>
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 4, right: 66, bottom: 4, left: 0 }}
        barCategoryGap="22%"
      >
        {/* Hidden: every bar is directly labelled, so an axis would just repeat
            the numbers and add chrome. */}
        <XAxis type="number" hide domain={[0, 'dataMax']} />
        <YAxis
          type="category"
          dataKey="label"
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          width={width}
          interval={0}
        />
        <Tooltip content={<DistributionTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
        <Bar dataKey="count" maxBarSize={18} radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {rows.map((point) => (
            <Cell key={point.option} fill={point.muted ? MUTED : ACCENT} />
          ))}
          <LabelList
            dataKey="tip"
            position="right"
            offset={8}
            // Values wear a text token, never the series colour.
            fill={AXIS}
            fontSize={11}
            className="tabular"
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function DayTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload?: DayPoint }[]
}) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-foreground">{point.label}</p>
      <p className="tabular mt-0.5 text-muted-foreground">
        {point.count} {point.count === 1 ? 'response' : 'responses'}
      </p>
    </div>
  )
}

/**
 * Responses per day. Columns rather than a line: these are discrete counts, and
 * a line between them would imply a rate that was never measured.
 */
export function ResponsesByDayChart({ data }: { data: DayPoint[] }) {
  if (data.length === 0) {
    return <EmptyState title="No responses yet" className="py-8" />
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="label"
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          minTickGap={16}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          width={28}
          allowDecimals={false}
        />
        <Tooltip content={<DayTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
        <Bar
          dataKey="count"
          fill={ACCENT}
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
