import { AlertTriangle } from 'lucide-react'
import { SECTION_SLOTS, label } from '@/lib/enums'
import { slotState, type CapacityReport, type SlotState } from '@/lib/inventory'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusPill } from '@/components/status-pill'

const STATE_LABEL: Record<SlotState, string> = {
  OPEN: 'OPEN',
  FULL: 'FULL',
  OVERSOLD: '⚠ OVERSOLD',
}

function SlotRow({
  name,
  sold,
  cap,
  note,
}: {
  name: string
  sold: number
  cap: number
  note?: string
}) {
  const state = slotState(sold, cap)

  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={cn(
            'tabular text-sm font-semibold',
            state === 'OVERSOLD' && 'text-danger'
          )}
        >
          {sold} / {cap}
        </span>
        <StatusPill value={state}>{STATE_LABEL[state]}</StatusPill>
      </div>
    </div>
  )
}

/**
 * Per-issue inventory, read straight from the shared CapacityReport so these
 * numbers always match the dashboard.
 */
export function CapacityPanel({
  report,
  soldOutTarget,
}: {
  report: CapacityReport
  soldOutTarget: number
}) {
  const ratioPct = Math.min(100, Math.round((report.totalSold / soldOutTarget) * 100))
  const overTarget = report.totalSold > soldOutTarget

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle>Inventory</CardTitle>
        {report.oversold ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">
            <AlertTriangle className="size-3.5" />
            Oversold
          </span>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="divide-y divide-border">
          <SlotRow name="Headline" sold={report.headline.sold} cap={report.headline.cap} />
          <SlotRow name="Feature" sold={report.feature.sold} cap={report.feature.cap} />
          <SlotRow
            name="Bulletin"
            sold={report.bulletin.sold}
            cap={report.bulletin.cap}
            note={
              report.bulletin.takeover
                ? 'Takeover — consumes every bulletin slot'
                : 'Classified + Banner share these slots'
            }
          />
          <SlotRow
            name="Featured Event"
            sold={report.featuredEvent.sold}
            cap={report.featuredEvent.cap}
          />
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Section sponsors
          </p>
          <div className="divide-y divide-border">
            {SECTION_SLOTS.map((slot) => {
              const section = report.sections[slot] ?? { sold: 0, cap: 1 }
              return (
                <SlotRow
                  key={slot}
                  name={label(slot)}
                  sold={section.sold}
                  cap={section.cap}
                />
              )
            })}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Content-to-ad ratio
            </p>
            <p className="tabular text-sm font-semibold">
              {report.totalSold} / {soldOutTarget} slots
            </p>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={report.totalSold}
            aria-valuemin={0}
            aria-valuemax={soldOutTarget}
            aria-label="Ads sold against the soft sold-out target"
          >
            {/* Steel Blue, not Sea Glass: the fill has to clear 3:1 against the
                track to be readable as a meter (docs/BRANDING.md §1). */}
            <div
              className={cn(
                'h-full rounded-full transition-all',
                overTarget ? 'bg-attention' : 'bg-steel'
              )}
              style={{ width: `${ratioPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {overTarget
              ? `Past the soft target of ${soldOutTarget} — the issue is ad-heavy against the 3:1 content-to-ad goal.`
              : `Soft target is ${soldOutTarget} slots (roughly sold out at a 3:1 content-to-ad ratio). Guidance only — it never blocks a booking.`}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
