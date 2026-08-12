'use client'

import dynamic from 'next/dynamic'
import type { DayPoint, DistributionPoint } from '@/lib/survey'
import { ChartSkeleton } from '@/components/ui/chart-skeleton'

/**
 * The survey charts, loaded on their own — same reasoning as the dashboard's
 * (`components/dashboard/charts.tsx`). This page is nearly all charts, so it
 * carried the whole of Recharts on first load for a set of bars that only mean
 * anything once you have scrolled to them.
 *
 * The implementations live in `charts-impl.tsx`; import from here, not there,
 * or the split is undone.
 */

const DAY_CHART_HEIGHT = 200

const LazyDistributionChart = dynamic(
  () => import('./charts-impl').then((mod) => mod.DistributionChart),
  { ssr: false, loading: () => null }
)

export const ResponsesByDayChart = dynamic(
  () => import('./charts-impl').then((mod) => mod.ResponsesByDayChart),
  { ssr: false, loading: () => <ChartSkeleton height={DAY_CHART_HEIGHT} /> }
)

/**
 * The bar chart sizes itself to how many options the question had, and
 * `next/dynamic`'s `loading` never sees props — so the placeholder is rendered
 * here, where the row count is known. The formula matches the one in the
 * implementation; keep the two in step.
 */
export function DistributionChart(props: {
  data: DistributionPoint[]
  labelWidth?: number
}) {
  // With no answers the chart renders a short empty state instead.
  if (props.data.length === 0) return <LazyDistributionChart {...props} />

  return (
    <div style={{ minHeight: Math.max(84, props.data.length * 30 + 12) }}>
      <LazyDistributionChart {...props} />
    </div>
  )
}
