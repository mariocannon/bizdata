/**
 * Holds a chart's space while its code loads.
 *
 * Charting is the heaviest thing the app ships to the browser, and it is never
 * the first thing an operator reads — the KPI row and the chase list are. So
 * the charts load after the page rather than in front of it, and this stands in
 * the gap at the exact height the chart will take, so nothing jumps.
 */
export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div
      className="animate-pulse rounded-md bg-muted"
      style={{ height }}
      role="presentation"
    />
  )
}
