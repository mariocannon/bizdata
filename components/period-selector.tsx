'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { PERIODS, PERIOD_LABELS, type Period } from '@/lib/period'
import { cn } from '@/lib/utils'

/** Drives every widget on the dashboard via `?period=`. */
export function PeriodSelector({ current }: { current: Period }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function hrefFor(period: Period) {
    const params = new URLSearchParams(searchParams.toString())
    if (period === 'month') params.delete('period')
    else params.set('period', period)
    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  return (
    <div className="inline-flex items-center rounded-md border border-border bg-muted/60 p-0.5">
      {PERIODS.map((period) => (
        <Link
          key={period}
          href={hrefFor(period)}
          scroll={false}
          aria-current={period === current ? 'true' : undefined}
          className={cn(
            'rounded px-3 py-1 text-sm font-medium transition-colors',
            period === current
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {PERIOD_LABELS[period]}
        </Link>
      ))}
    </div>
  )
}
