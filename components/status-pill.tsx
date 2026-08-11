import * as React from 'react'
import { cn } from '@/lib/utils'
import { label } from '@/lib/enums'

/**
 * One colour per status, used identically everywhere in the app, built only
 * from the brand's semantic states (docs/BRANDING.md §6):
 *
 *   neutral   — dormant or done-with, nothing to act on
 *   progress  — in flight, Steel Blue
 *   accepted  — agreed but not yet delivered, Sea Glass
 *   success   — landed, Kelp
 *   attention — needs chasing, Ochre
 *   danger    — wrong, needs fixing now, Coral
 */
const NEUTRAL = 'bg-neutral-soft text-neutral border-neutral-border'
const PROGRESS = 'bg-progress-soft text-progress border-progress-border'
const ACCEPTED = 'bg-tide-100 text-tide-800 border-tide-200'
const SUCCESS = 'bg-success-soft text-success border-success-border'
const ATTENTION = 'bg-attention-soft text-attention border-attention-border'
const DANGER = 'bg-danger-soft text-danger border-danger-border'
const RETIRED = `${NEUTRAL} line-through decoration-mist`

const STATUS_STYLES: Record<string, string> = {
  // Advertiser pipeline
  PROSPECT: NEUTRAL,
  PITCHED: PROGRESS,
  WON: ACCEPTED,
  ACTIVE: SUCCESS,
  PAUSED: NEUTRAL,
  LOST: RETIRED,

  // Booking status
  RESERVED: PROGRESS,
  CONFIRMED: ACCEPTED,
  RAN: SUCCESS,
  CANCELLED: RETIRED,

  // Payment
  UNPAID: ATTENTION,
  INVOICED: PROGRESS,
  PAID: SUCCESS,

  // Issue status
  PLANNING: NEUTRAL,
  DRAFTING: PROGRESS,
  READY: ACCEPTED,
  SENT: SUCCESS,

  // Classified status
  DRAFT: NEUTRAL,
  APPROVED: ACCEPTED,
  PUBLISHED: SUCCESS,
  ARCHIVED: NEUTRAL,

  // Inventory states
  OPEN: SUCCESS,
  FULL: NEUTRAL,
  OVERSOLD: DANGER,
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
        STATUS_STYLES[value] ?? NEUTRAL,
        className
      )}
    >
      {children ?? label(value)}
    </span>
  )
}

export { STATUS_STYLES }
