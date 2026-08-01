'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MONTH_PARAM, monthFromParam } from '@/lib/calendar'
import { Button } from '@/components/ui/button'

export type CalendarEvent = {
  id: string
  /** ISO date string (yyyy-MM-dd) — dates are rendered in the viewer's locale. */
  date: string
  title: string
  subtitle?: string
  href: string
  /** Tailwind classes for the event chip. */
  className?: string
}

export function MonthCalendar({
  month,
  events,
  emptyLabel = 'Nothing scheduled this month.',
}: {
  /** ISO `yyyy-MM` of the month being shown. */
  month: string
  events: CalendarEvent[]
  emptyLabel?: string
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const current = monthFromParam(month)
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(current), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(current), { weekStartsOn: 1 }),
  })

  const byDay = new Map<string, CalendarEvent[]>()
  for (const event of events) {
    const list = byDay.get(event.date) ?? []
    list.push(event)
    byDay.set(event.date, list)
  }

  function monthHref(target: Date) {
    const params = new URLSearchParams(searchParams.toString())
    params.set(MONTH_PARAM, format(target, 'yyyy-MM'))
    return `${pathname}?${params.toString()}`
  }

  const inMonth = events.filter((event) =>
    isSameMonth(new Date(`${event.date}T12:00:00`), current)
  ).length

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold">{format(current, 'MMMM yyyy')}</p>
          <p className="tabular text-xs text-muted-foreground">
            {inMonth} {inMonth === 1 ? 'entry' : 'entries'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" asChild>
            <Link href={monthHref(subMonths(current, 1))} scroll={false} aria-label="Previous month">
              <ChevronLeft />
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={monthHref(new Date())} scroll={false}>
              Today
            </Link>
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link href={monthHref(addMonths(current, 1))} scroll={false} aria-label="Next month">
              <ChevronRight />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-border bg-muted/60">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div
            key={day}
            className="px-2 py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayEvents = byDay.get(key) ?? []
          const outside = !isSameMonth(day, current)

          return (
            <div
              key={key}
              className={cn(
                'min-h-[104px] border-b border-r border-border p-1.5 last:border-r-0',
                outside && 'bg-muted/30'
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    'tabular inline-flex size-5 items-center justify-center rounded-full text-xs',
                    outside ? 'text-muted-foreground/60' : 'text-muted-foreground',
                    isToday(day) && 'bg-primary font-semibold text-primary-foreground'
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                {dayEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={event.href}
                    title={event.subtitle ? `${event.title} — ${event.subtitle}` : event.title}
                    className={cn(
                      'block truncate rounded px-1.5 py-1 text-xs font-medium transition-opacity hover:opacity-80',
                      event.className ?? 'bg-tide-100 text-tide-800'
                    )}
                  >
                    {event.title}
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {events.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
      ) : null}
    </div>
  )
}
