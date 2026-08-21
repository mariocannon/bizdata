import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * The media kit is read the way a deck is read — one idea per panel, scrolled
 * top to bottom — so the page is built from these rather than from the app's
 * dense cards. Three grounds, alternated so consecutive panels never merge into
 * one another (docs/BRANDING.md §5, extension).
 */
export type PanelTone = 'paper' | 'tint' | 'dark'

const TONES: Record<PanelTone, string> = {
  paper: 'bg-card border-border',
  tint: 'bg-tide-50 border-tide-100',
  // The one dark ground on the page, for the two panels that have to land: the
  // numbers at the top and the ask at the bottom.
  dark: 'bg-tide-900 border-tide-800 text-foam',
}

export function Panel({
  tone = 'paper',
  className,
  children,
}: {
  tone?: PanelTone
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn('rounded-lg border p-6 shadow-sm sm:p-8', TONES[tone], className)}>
      {children}
    </section>
  )
}

/**
 * Eyebrow, heading, lede. On a dark panel the eyebrow steps up the coastal ramp
 * to `tide-200` — Steel Blue is a light-ground colour and disappears on Deep
 * Harbor — and the lede goes with it.
 */
export function SectionHead({
  eyebrow,
  title,
  intro,
  tone = 'paper',
}: {
  eyebrow: string
  title: React.ReactNode
  intro?: React.ReactNode
  tone?: PanelTone
}) {
  return (
    <header className="mb-6">
      <p className={cn('eyebrow', tone === 'dark' && 'text-tide-200')}>{eyebrow}</p>
      <h2 className="mt-2 text-balance text-2xl font-extrabold tracking-[-0.015em] sm:text-3xl">
        {title}
      </h2>
      {intro ? (
        <p
          className={cn(
            'mt-3 max-w-prose text-pretty leading-6',
            tone === 'dark' ? 'text-tide-200' : 'text-muted-foreground'
          )}
        >
          {intro}
        </p>
      ) : null}
    </header>
  )
}
