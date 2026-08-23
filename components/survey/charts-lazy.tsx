'use client'

import dynamic from 'next/dynamic'
import { ChartFrame } from '@/components/chart-frame'
import type { DistributionPoint, DayPoint } from '@/lib/survey'

/**
 * The survey charts, loaded on demand — same reasoning as the dashboard's
 * (`components/dashboard/charts-lazy.tsx`), and this page gains the most from
 * it: it is a wall of charts on top of a handful of KPI cards, and it now
 * starts at roughly half its old first-load weight.
 */

const Distribution = dynamic(
  () => import('./charts').then((module) => module.DistributionChart),
  { ssr: false }
)

const ResponsesByDay = dynamic(
  () => import('./charts').then((module) => module.ResponsesByDayChart),
  { ssr: false }
)

/** Mirrors the height `DistributionChart` gives its own container. */
function distributionHeight(rows: number): number {
  return Math.max(84, rows * 30 + 12)
}

export function DistributionChart({
  data,
  labelWidth,
}: {
  data: DistributionPoint[]
  labelWidth?: number
}) {
  return (
    <ChartFrame height={distributionHeight(data.length)}>
      <Distribution data={data} labelWidth={labelWidth} />
    </ChartFrame>
  )
}

export function ResponsesByDayChart({ data }: { data: DayPoint[] }) {
  return (
    <ChartFrame height={200}>
      <ResponsesByDay data={data} />
    </ChartFrame>
  )
}
