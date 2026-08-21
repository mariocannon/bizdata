import * as React from 'react'
import type { Band, Breakdown, Claim } from '@/lib/media-kit'
import { cn } from '@/lib/utils'

/**
 * How the media kit says a number.
 *
 * Every figure that reaches these components has already been banded and
 * rounded in `lib/media-kit.ts` — there is no exact share to draw and no count
 * to plot, which is why none of this is a chart. A bar here is a Sea Glass fill
 * measuring a rounded percentage, and the percentage is written beside it, so
 * colour carries no meaning and nothing is read off a pixel length
 * (docs/BRANDING.md §5, extension).
 */

/**
 * A headline figure on the dark band: as big as the page gets.
 *
 * A word set at the size of a number reads as shouting rather than as a
 * measurement, so "Weekly" and "Free" take a step down from "2,000+" — the
 * band still scans as one row, and the numbers stay the thing your eye lands
 * on.
 */
export function StatFigure({
  value,
  label,
  kind = 'number',
}: {
  value: string
  label: string
  kind?: 'number' | 'word'
}) {
  return (
    <div>
      <p
        className={cn(
          'tabular font-extrabold leading-none tracking-tight text-tide-100',
          kind === 'number' ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl'
        )}
      >
        {value}
      </p>
      <p className="mt-3 text-sm leading-snug text-tide-200">{label}</p>
    </div>
  )
}

/**
 * One claim, said the way a person would say it: "2 in 3" + "own their home".
 * The fraction is Steel Blue at display size, which clears the 3:1 large-text
 * floor that Steel Blue misses for body copy — and never Sea Glass, which is a
 * fill and not a letter.
 */
export function ClaimTile({ words, claim }: Claim) {
  return (
    <div className="h-full rounded-lg border border-border bg-card p-5 shadow-sm">
      <p className="tabular text-3xl font-extrabold leading-none tracking-tight text-steel">
        {words}
      </p>
      <p className="mt-3 leading-snug">{claim}</p>
    </div>
  )
}

/** A band of readers: label, Sea Glass fill, and the rounded share written out. */
export function BandRow({ band }: { band: Band }) {
  return (
    <li className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 text-muted-foreground sm:w-40">{band.label}</span>
      <span
        className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary"
        aria-hidden
      >
        <span
          className="block h-full rounded-full bg-seaglass"
          style={{ width: `${band.width}%` }}
        />
      </span>
      <span className="tabular w-14 shrink-0 text-right font-medium">{band.percent}</span>
    </li>
  )
}

export function BreakdownCard({ breakdown }: { breakdown: Breakdown }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h3 className="font-semibold">{breakdown.title}</h3>
      <ul className="mt-4 flex flex-col gap-2.5">
        {breakdown.bands.map((band) => (
          <BandRow key={band.label} band={band} />
        ))}
      </ul>
    </div>
  )
}

export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm">
      {children}
    </li>
  )
}

/** One reason to advertise: an icon, a short title, a sentence. */
export function ReasonCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="h-full rounded-lg border border-border bg-card p-5 shadow-sm">
      <span className="flex size-9 items-center justify-center rounded-lg bg-tide-100">
        <Icon className="size-4 text-tide-800" />
      </span>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{children}</p>
    </div>
  )
}

/** A row on the rate card: what it is, what it costs, how many exist. */
export function PlacementCard({
  name,
  price,
  availability,
  children,
}: {
  name: string
  price: string
  availability: string
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-semibold">{name}</h3>
        <p className="tabular shrink-0 text-xl font-extrabold tracking-tight text-steel">
          {price}
        </p>
      </div>
      <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{children}</p>
      <p className={cn('mt-4 text-xs font-medium uppercase tracking-wide text-driftwood')}>
        {availability}
      </p>
    </div>
  )
}
