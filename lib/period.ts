import {
  endOfMonth,
  endOfQuarter,
  endOfYear,
  startOfMonth,
  startOfQuarter,
  startOfYear,
} from 'date-fns'

export const PERIODS = ['month', 'quarter', 'year', 'all'] as const
export type Period = (typeof PERIODS)[number]

export const PERIOD_LABELS: Record<Period, string> = {
  month: 'This month',
  quarter: 'This quarter',
  year: 'This year',
  all: 'All time',
}

export function isPeriod(value: string | undefined): value is Period {
  return PERIODS.includes(value as Period)
}

export type PeriodRange = { start: Date | null; end: Date | null; label: string }

/**
 * Revenue is attributed to the booking's issue publish date, so every widget
 * on the dashboard filters against the same window.
 */
export function periodRange(period: Period, now = new Date()): PeriodRange {
  switch (period) {
    case 'month':
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
        label: PERIOD_LABELS.month,
      }
    case 'quarter':
      return {
        start: startOfQuarter(now),
        end: endOfQuarter(now),
        label: PERIOD_LABELS.quarter,
      }
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now), label: PERIOD_LABELS.year }
    default:
      return { start: null, end: null, label: PERIOD_LABELS.all }
  }
}

export function inRange(date: Date, range: PeriodRange): boolean {
  if (range.start && date < range.start) return false
  if (range.end && date > range.end) return false
  return true
}
