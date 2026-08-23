'use client'

import dynamic from 'next/dynamic'
import { ChartFrame } from '@/components/chart-frame'
import type { BreakdownPoint, IssueRevenuePoint } from './charts'

/**
 * The dashboard's charts, loaded on demand.
 *
 * Recharts was the single largest thing in this page's first load — on its own
 * it was most of the difference between `/` at 209kB and every other route at
 * ~150kB. None of it is needed to read the KPI cards, the chase list or the
 * pipeline, which is what someone opening the dashboard is usually after, so
 * the charts fetch their own code once the page is interactive.
 *
 * `ssr: false` costs nothing here: `ResponsiveContainer` measures the DOM, so
 * it already rendered to an empty box on the server and the charts were always
 * drawn in the browser. `ChartFrame` holds their height so nothing shifts when
 * they arrive.
 */

const RevenueByIssue = dynamic(
  () => import('./charts').then((module) => module.RevenueByIssueChart),
  { ssr: false }
)

const Breakdown = dynamic(
  () => import('./charts').then((module) => module.BreakdownBarChart),
  { ssr: false }
)

export function RevenueByIssueChart({ data }: { data: IssueRevenuePoint[] }) {
  return (
    <ChartFrame height={260}>
      <RevenueByIssue data={data} />
    </ChartFrame>
  )
}

export function BreakdownBarChart({
  data,
  height = 220,
  color,
}: {
  data: BreakdownPoint[]
  height?: number
  color?: string
}) {
  return (
    <ChartFrame height={height}>
      <Breakdown data={data} height={height} color={color} />
    </ChartFrame>
  )
}
