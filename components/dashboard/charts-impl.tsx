'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatMoney } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'

/**
 * Two-series palette, validated for colour-vision deficiency against the light
 * chart surface (worst adjacent pair ΔE 20.0 deutan / 26.1 normal).
 * Collected reads as the calm teal; outstanding carries the app's amber
 * "needs chasing" meaning.
 */
export const SERIES = {
  collected: '#0891b2',
  outstanding: '#b45309',
} as const

const AXIS = 'hsl(var(--muted-foreground))'
const GRID = 'hsl(var(--border))'
const SURFACE = 'hsl(var(--card))'

const axisTick = { fill: AXIS, fontSize: 11 }

function TooltipCard({
  active,
  payload,
  label: title,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  const total = payload.reduce((sum, entry) => sum + (entry.value ?? 0), 0)

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold text-foreground">{title}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-1.5 text-muted-foreground">
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ background: entry.color }}
          />
          {entry.name}
          <span className="tabular ml-auto pl-3 font-medium text-foreground">
            {formatMoney(entry.value ?? 0)}
          </span>
        </p>
      ))}
      {payload.length > 1 ? (
        <p className="tabular mt-1 border-t border-border pt-1 font-medium text-foreground">
          Total {formatMoney(total)}
        </p>
      ) : null}
    </div>
  )
}

export type IssueRevenuePoint = {
  issue: string
  collected: number
  outstanding: number
}

/** Revenue by issue — collected stacked under outstanding. */
export function RevenueByIssueChart({ data }: { data: IssueRevenuePoint[] }) {
  if (data.length === 0) {
    return <EmptyState title="No issues in this period" className="py-10" />
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="issue"
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          interval={0}
        />
        <YAxis
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(value: number) => formatMoney(value)}
        />
        <Tooltip content={<TooltipCard />} cursor={{ fill: 'hsl(var(--muted))' }} />
        <Legend
          verticalAlign="top"
          align="right"
          height={28}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: AXIS }}
        />
        {/* A 2px surface stroke gives the stacked segments their gap. */}
        <Bar
          dataKey="collected"
          name="Collected"
          stackId="revenue"
          fill={SERIES.collected}
          stroke={SURFACE}
          strokeWidth={2}
          maxBarSize={44}
          isAnimationActive={false}
        />
        <Bar
          dataKey="outstanding"
          name="Outstanding"
          stackId="revenue"
          fill={SERIES.outstanding}
          stroke={SURFACE}
          strokeWidth={2}
          radius={[4, 4, 0, 0]}
          maxBarSize={44}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

export type BreakdownPoint = { name: string; value: number }

/**
 * Single-measure breakdown as a horizontal bar — length is far easier to
 * compare across seven ad types than a donut's arc angles.
 */
export function BreakdownBarChart({
  data,
  height = 220,
  color = SERIES.collected,
}: {
  data: BreakdownPoint[]
  height?: number
  color?: string
}) {
  if (data.length === 0) {
    return <EmptyState title="Nothing booked in this period" className="py-10" />
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 48, bottom: 0, left: 0 }}
      >
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          tickFormatter={(value: number) => formatMoney(value)}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          width={132}
        />
        <Tooltip content={<TooltipCard />} cursor={{ fill: 'hsl(var(--muted))' }} />
        <Bar
          dataKey="value"
          name="Revenue"
          fill={color}
          radius={[0, 4, 4, 0]}
          maxBarSize={20}
          isAnimationActive={false}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
