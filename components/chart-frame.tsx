'use client'

/**
 * Reserves a chart's space while its code is still on the wire.
 *
 * Recharts is by some distance the heaviest thing this app ships. It is loaded
 * on demand (see `charts-lazy.tsx` beside each chart module) rather than in the
 * first payload, and this frame holds the exact height the chart will take so
 * nothing below it moves when it arrives.
 */
export function ChartFrame({
  height,
  children,
}: {
  height: number
  children: React.ReactNode
}) {
  return (
    <div style={{ minHeight: height }} className="w-full">
      {children}
    </div>
  )
}
