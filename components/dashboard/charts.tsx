'use client'

import dynamic from 'next/dynamic'
import { ChartSkeleton } from '@/components/ui/chart-skeleton'
import type { BreakdownPoint, IssueRevenuePoint } from './charts-impl'

/**
 * The dashboard's charts, loaded on their own.
 *
 * Recharts and its d3 dependencies are by far the largest thing the app sends
 * to the browser. Bundled into the dashboard they sat in front of the whole
 * page: the numbers an operator actually opens the app for — booked, collected,
 * outstanding, the chase list — waited on a charting library to parse before
 * they could paint. Splitting them out lets the page render immediately and the
 * charts arrive a beat later, in space already reserved for them.
 *
 * The implementations live in `charts-impl.tsx`; import from here, not there,
 * or the split is undone.
 */

export type { BreakdownPoint, IssueRevenuePoint }

const REVENUE_HEIGHT = 260

export const RevenueByIssueChart = dynamic(
  () => import('./charts-impl').then((mod) => mod.RevenueByIssueChart),
  { ssr: false, loading: () => <ChartSkeleton height={REVENUE_HEIGHT} /> }
)

const LazyBreakdownBarChart = dynamic(
  () => import('./charts-impl').then((mod) => mod.BreakdownBarChart),
  { ssr: false, loading: () => null }
)

/**
 * This one's height is set by the caller, and `next/dynamic`'s `loading` never
 * sees props — so the placeholder is rendered here, where the height is known.
 */
export function BreakdownBarChart(props: {
  data: BreakdownPoint[]
  height?: number
  color?: string
}) {
  // With no data the chart renders a short empty state instead, so reserving
  // the full bar-chart height would leave a hole under it.
  if (props.data.length === 0) return <LazyBreakdownBarChart {...props} />


  return (
    <div style={{ minHeight: props.height ?? 220 }}>
      <LazyBreakdownBarChart {...props} />
    </div>
  )
}
