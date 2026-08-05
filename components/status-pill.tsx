import * as React from 'react'
import { cn } from '@/lib/utils'
import { label } from '@/lib/enums'

/**
 * One colour per status, used identically everywhere in the app.
 * Amber and red are reserved for states that need chasing (unpaid, oversold);
 * everything else stays in the calm coastal range.
 */
const STATUS_STYLES: Record<string, string> = {
  // Advertiser pipeline
  PROSPECT: 'bg-slate-100 text-slate-700 border-slate-200',
  PITCHED: 'bg-sky-100 text-sky-800 border-sky-200',
  WON: 'bg-tide-100 text-tide-800 border-tide-200',
  ACTIVE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  PAUSED: 'bg-slate-100 text-slate-600 border-slate-200',
  LOST: 'bg-slate-100 text-slate-500 border-slate-200 line-through decoration-slate-400',

  // Booking status
  RESERVED: 'bg-sky-100 text-sky-800 border-sky-200',
  CONFIRMED: 'bg-tide-100 text-tide-800 border-tide-200',
  RAN: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200 line-through decoration-slate-400',

  // Payment
  UNPAID: 'bg-amber-100 text-amber-900 border-amber-200',
  INVOICED: 'bg-sky-100 text-sky-800 border-sky-200',
  PAID: 'bg-emerald-100 text-emerald-800 border-emerald-200',

  // Issue status
  PLANNING: 'bg-slate-100 text-slate-700 border-slate-200',
  DRAFTING: 'bg-sky-100 text-sky-800 border-sky-200',
  READY: 'bg-tide-100 text-tide-800 border-tide-200',
  SENT: 'bg-emerald-100 text-emerald-800 border-emerald-200',

  // Classified status
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  APPROVED: 'bg-tide-100 text-tide-800 border-tide-200',
  PUBLISHED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  ARCHIVED: 'bg-slate-100 text-slate-500 border-slate-200',

  // Inventory states
  OPEN: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  FULL: 'bg-slate-100 text-slate-700 border-slate-200',
  OVERSOLD: 'bg-red-100 text-red-800 border-red-200',
}

export function StatusPill({
  value,
  className,
  children,
}: {
  value: string | null | undefined
  className?: string
  children?: React.ReactNode
}) {
  if (!value) return <span className="text-muted-foreground">—</span>

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
        STATUS_STYLES[value] ?? 'bg-slate-100 text-slate-700 border-slate-200',
        className
      )}
    >
      {children ?? label(value)}
    </span>
  )
}

export { STATUS_STYLES }
